import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';

import {NotificationsController} from '../src/modules/notifications/presentation/notifications.controller';
import {configureNotificationHttp} from '../src/modules/notifications/presentation/notification-http';
import {NOTIFICATION_SERVICES} from '../src/modules/notifications/notifications.tokens';
import {SESSION_AUTHENTICATOR} from '../src/modules/authentication/contracts';
import {OneSignalReadinessReader} from '../src/modules/notifications/infrastructure/onesignal-readiness-reader';
import {PostgresRequestBudget} from '../src/modules/notifications/infrastructure/postgres-request-budget';
import {notificationSession, NotificationTestClock} from './notifications-fixtures';

export const PRIVACY_TEST = {GRANT_ROUTE: 'identity-grant', FIRST_CONNECTION: 1} as const;

export const PRIVACY_SENTINEL = 'PRIVATE_SENTINEL_token_profile_email_phone_key';

void test('S10 HTTP, provider errors and maintenance logs retain no private sentinel', async (t) => {
  const captured: unknown[][] = [];
  const originals = {log: console.log, warn: console.warn, error: console.error};

  for (const method of ['log', 'warn', 'error'] as const)
    console[method] = (...args: unknown[]) => {
      captured.push(args);
    };

  t.after(() => Object.assign(console, originals));

  await t.test('HTTP suppresses raw errors from both authentication and use cases', async () => {
    let failAuthentication = false;

    class PrivacyModule {}
    Module({
      controllers: [NotificationsController],
      providers: [
        {
          provide: SESSION_AUTHENTICATOR,
          useValue: {
            authenticate: async () => {
              if (failAuthentication) throw new Error(PRIVACY_SENTINEL);

              return notificationSession;
            },
          },
        },
        {
          provide: NOTIFICATION_SERVICES,
          useValue: {
            issuer: {
              execute: async () => {
                throw new Error(PRIVACY_SENTINEL);
              },
            },
            verifier: {
              execute: async () => {
                throw new Error(PRIVACY_SENTINEL);
              },
            },
          },
        },
      ],
    })(PrivacyModule);

    const app = await NestFactory.create<NestExpressApplication>(PrivacyModule, {
      logger: false,
      bodyParser: false,
    });

    configureNotificationHttp(app);
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');

    try {
      for (const failure of [false, true]) {
        failAuthentication = failure;

        for (const route of ['identity-grant', 'readiness']) {
          const response = await fetch(`${await app.getUrl()}/api/notifications/${route}`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${PRIVACY_SENTINEL}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify(
              route === PRIVACY_TEST.GRANT_ROUTE
                ? {}
                : {subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48', platform: 'ios'},
            ),
          });

          assert.equal(response.status, 503);
          assert.equal(response.headers.get('cache-control'), 'no-store');
          assert.deepEqual(await response.json(), {code: 'notifications_unavailable'});
        }
      }
    } finally {
      await app.close();
    }
  });
  await t.test(
    'provider error body stays unread and identity credential reaches only fixed authorization',
    async () => {
      let canceled = false;
      const reader = new OneSignalReadinessReader(
        'synthetic-app',
        {
          sign: async () => ({
            externalId: notificationSession.accountId,
            token: PRIVACY_SENTINEL,
            expiresAt: '2033-05-18T03:38:20.000Z',
          }),
        },
        {
          reserve: async () => {},

          defer: async () => {},

          cleanup: async () => 0,
        },
        {
          fetch: async (url, init) => {
            assert.equal(
              url,
              'https://api.onesignal.com/apps/synthetic-app/users/by/external_id/user_test_a',
            );
            assert.equal(
              new Headers(init.headers).get('authorization'),
              `Bearer ${PRIVACY_SENTINEL}`,
            );
            assert.equal(init.redirect, 'error');

            return new Response(
              new ReadableStream(
                {
                  cancel() {
                    canceled = true;
                  },
                },
                {highWaterMark: 0},
              ),
              {status: 500},
            );
          },
        },
        new NotificationTestClock(),
      );

      await assert.rejects(
        reader.read(notificationSession, {
          subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48',
          platform: 'ios',
        }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message, 'notifications_unavailable');
          assert.equal(error.stack?.includes(PRIVACY_SENTINEL), false);

          return true;
        },
      );
      assert.equal(canceled, true);
    },
  );
  await t.test(
    'storage failures redact underlying errors and cleanup emits aggregate diagnostic only',
    async () => {
      let connections = 0;
      const budget = new PostgresRequestBudget(
        {
          connect: async () => {
            connections++;

            if (connections > PRIVACY_TEST.FIRST_CONNECTION) throw new Error(PRIVACY_SENTINEL);

            return {
              query: async () => ({rows: [], rowCount: 1}),

              release: () => {},
            };
          },
        },
        'app:synthetic',
      );

      await budget.reserve('app:synthetic:account:opaque:grant', 5000, true);
      assert.deepEqual(captured, [['Notification budget cleanup unavailable']]);
      await assert.rejects(budget.reserve('app:synthetic:provider', 1000, false), {
        message: 'notifications_unavailable',
      });
    },
  );
  assert.equal(JSON.stringify(captured).includes(PRIVACY_SENTINEL), false);
});
