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
import {
  AuthenticationFailure,
  AUTHENTICATION_FAILURE,
} from '../src/modules/authentication/contracts';
import {
  NotificationFailure,
  NOTIFICATION_ERROR,
} from '../src/modules/notifications/application/notification-failure';
import {notificationSession} from './notifications-fixtures';

export const HTTP_TEST_BEARER = 'synthetic-bearer';

void test('S11 live HTTP enforces bearer, strict DTOs, limits and safe result mapping', async (t) => {
  let calls = 0;
  let failure: Error | undefined;
  const services = {
    issuer: {
      execute: async () => {
        calls++;

        if (failure) throw failure;

        return {
          externalId: 'user_test_a',
          token: 'synthetic-native-token',
          expiresAt: '2033-05-18T03:38:20.000Z',
        };
      },
    },
    verifier: {
      execute: async () => {
        calls++;

        if (failure) throw failure;

        return {status: 'ready', checkedAt: '2033-05-18T03:33:20.000Z', validForSeconds: 60};
      },
    },
  };

  class TestModule {}
  Module({
    controllers: [NotificationsController],
    providers: [
      {provide: NOTIFICATION_SERVICES, useValue: services},
      {
        provide: SESSION_AUTHENTICATOR,
        useValue: {
          authenticate: async (bearer: string) => {
            if (bearer !== HTTP_TEST_BEARER)
              throw new AuthenticationFailure({code: AUTHENTICATION_FAILURE.REQUIRED});

            return notificationSession;
          },
        },
      },
    ],
  })(TestModule);

  const app = await NestFactory.create<NestExpressApplication>(TestModule, {
    logger: false,
    bodyParser: false,
  });

  configureNotificationHttp(app);
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());

  const url = await app.getUrl();

  const send = (path: string, body: unknown = {}, headers: Record<string, string> = {}) =>
    fetch(`${url}/api/notifications/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer synthetic-bearer',
        ...headers,
      },
      body: JSON.stringify(body),
    });

  await t.test('both exact routes produce no-store 200 responses', async () => {
    const grant = await send('identity-grant');

    assert.equal(grant.status, 200);
    assert.equal(grant.headers.get('cache-control'), 'no-store');

    const grantBody: unknown = await grant.json();

    assert.ok(typeof grantBody === 'object' && grantBody !== null && 'externalId' in grantBody);
    assert.equal(grantBody.externalId, 'user_test_a');

    const ready = await send('readiness', {
      subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48',
      platform: 'ios',
    });

    assert.equal(ready.status, 200);

    const readyBody: unknown = await ready.json();

    assert.ok(
      typeof readyBody === 'object' && readyBody !== null && 'validForSeconds' in readyBody,
    );
    assert.equal(readyBody.validForSeconds, 60);
  });

  for (const authorization of ['', 'Basic value', 'Bearer wrong'])
    await t.test('invalid or absent bearer cannot use cookies', async () => {
      const before = calls;
      const response = await send(
        'identity-grant',
        {},
        {authorization, cookie: '__session=synthetic-bearer'},
      );

      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {code: 'authentication_required'});
      assert.equal(calls, before);
    });

  for (const body of [
    [],
    null,
    {accountId: 'other'},
    {externalId: 'other'},
    {appId: 'other'},
    {providerUrl: 'https://evil.test'},
    {extra: true},
  ])
    await t.test('strict grant body rejects input without calling provider', async () => {
      const before = calls;
      const response = await send('identity-grant', body);

      assert.equal(response.status, 400);
      assert.equal(calls, before);
    });

  for (const body of [
    {},
    {subscriptionId: 'invalid', platform: 'ios'},
    {subscriptionId: 'C603D229-463E-4D9A-AE5F-5F40EB8C6A48', platform: 'ios'},
    {subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48', platform: 'web'},
    {subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48', platform: 'ios', accountId: 'other'},
  ])
    await t.test('readiness rejects malformed and caller-owned account fields', async () => {
      const response = await send('readiness', body);

      assert.equal(response.status, 400);
    });

  await t.test('caller query, wrong media type and malformed JSON rejected', async () => {
    assert.equal((await send('identity-grant?accountId=other')).status, 400);
    assert.equal((await send('identity-grant', {}, {'content-type': 'text/plain'})).status, 400);

    const malformed = await fetch(`${url}/api/notifications/identity-grant`, {
      method: 'POST',
      headers: {authorization: 'Bearer synthetic-bearer', 'content-type': 'application/json'},
      body: '{',
    });

    assert.equal(malformed.status, 400);
    assert.equal(malformed.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await malformed.json(), {code: 'invalid_request'});
  });
  await t.test('4 KiB enforced before use case including unknown-size bodies', async () => {
    const before = calls;
    const response = await send('identity-grant', {data: 'x'.repeat(4096)});

    assert.equal(response.status, 413);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {code: 'request_too_large'});
    assert.equal(calls, before);
  });

  for (const [error, status, code, retry] of [
    [
      new NotificationFailure({code: NOTIFICATION_ERROR.RETRY, retryAfterSeconds: 120}),
      429,
      'retry_later',
      60,
    ],
    [
      new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE, retryAfterSeconds: 5}),
      503,
      'notifications_unavailable',
      5,
    ],
    [new Error('PRIVATE KEY provider profile'), 503, 'notifications_unavailable', undefined],
    [
      new AuthenticationFailure({code: AUTHENTICATION_FAILURE.UNAVAILABLE}),
      503,
      'notifications_unavailable',
      undefined,
    ],
  ] as const)
    await t.test('safe errors and Retry-After agree', async () => {
      failure = error;

      const response = await send('identity-grant');

      assert.equal(response.status, status);
      assert.equal(response.headers.get('retry-after'), retry === undefined ? null : String(retry));
      assert.deepEqual(
        await response.json(),
        retry === undefined ? {code} : {code, retryAfterSeconds: retry},
      );
    });
});
