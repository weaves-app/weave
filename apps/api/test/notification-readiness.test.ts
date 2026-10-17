import assert from 'node:assert/strict';
import {test} from 'node:test';

import {OneSignalReadinessReader} from '../src/modules/notifications/infrastructure/onesignal-readiness-reader';
import {NotificationTestClock, notificationSession} from './notifications-fixtures';

void test('S11 provider validates exact app/account/installation and preserves failures', async (t) => {
  const {generateKeyPair, SignJWT, jwtVerify} = await import('jose');
  const pair = await generateKeyPair('ES256');
  const clock = new NotificationTestClock();
  const query = {
    subscriptionId: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48',
    platform: 'android' as const,
  };
  const original = {
    identity: {external_id: 'user_test_a'},
    subscriptions: [
      {id: query.subscriptionId, type: 'AndroidPush', enabled: true, token: 'sensitive-push-token'},
    ],
  };
  let body: unknown = original;
  let status = 200;
  let cooldown = '120';
  let reserved = false;
  let observedDelay = 0;
  let calls = 0;
  const signer = {
    sign: async () => ({
      externalId: 'user_test_a',
      expiresAt: '2033-05-18T03:38:20.000Z',
      token: await new SignJWT({identity: {external_id: 'user_test_a'}})
        .setProtectedHeader({alg: 'ES256'})
        .setIssuer('app-fixture')
        .setExpirationTime(2000000300)
        .sign(pair.privateKey),
    }),
  };
  const budget = {
    reserve: async () => {
      reserved = true;
    },

    defer: async (_key: string, delay: number) => {
      observedDelay = delay;
    },

    cleanup: async () => 0,
  };
  const http = {
    fetch: async (url: string, init: RequestInit) => {
      calls++;
      assert.equal(reserved, true);
      reserved = false;
      assert.equal(
        url,
        'https://api.onesignal.com/apps/app-fixture/users/by/external_id/user_test_a',
      );

      const bearer = new Headers(init.headers).get('authorization')?.replace('Bearer ', '');

      assert.ok(bearer);
      assert.equal(
        (
          await jwtVerify(bearer, pair.publicKey, {
            issuer: 'app-fixture',
            currentDate: new Date(clock.now()),
          })
        ).payload.identity && true,
        true,
      );
      assert.equal(init.redirect, 'error');

      return Response.json(body, {status, headers: {'retry-after': cooldown}});
    },
  };
  const reader = new OneSignalReadinessReader('app-fixture', signer, budget, http, clock);

  await t.test('exact eligible installation and iOS type succeed without app_id', async () => {
    assert.equal(await reader.read(notificationSession, query), true);
    body = {...original, subscriptions: [{...original.subscriptions[0], type: 'iOSPush'}]};
    assert.equal(await reader.read(notificationSession, {...query, platform: 'ios'}), true);
  });

  for (const replacement of [
    {id: 'other'},
    {type: 'iOSPush'},
    {enabled: false},
    {token: ''},
    {app_id: 'wrong-app'},
  ])
    await t.test(
      `mismatched installation ${JSON.stringify(replacement)} stays pending`,
      async () => {
        body = {...original, subscriptions: [{...original.subscriptions[0], ...replacement}]};
        assert.equal(await reader.read(notificationSession, query), false);
      },
    );

  await t.test('wrong account, no subscription and 404 indistinguishable', async () => {
    body = {...original, identity: {external_id: 'other'}};
    assert.equal(await reader.read(notificationSession, query), false);
    body = {...original, subscriptions: []};
    assert.equal(await reader.read(notificationSession, query), false);
    status = 404;
    assert.equal(await reader.read(notificationSession, query), false);
    status = 200;
  });

  for (const malformed of [
    null,
    {},
    {identity: {external_id: 42}, subscriptions: []},
    {...original, subscriptions: {}},
    {...original, subscriptions: [{...original.subscriptions[0], enabled: 'true'}]},
    {...original, subscriptions: [{...original.subscriptions[0], token: 42}]},
  ])
    await t.test('malformed success is unavailable', async () => {
      body = malformed;
      await assert.rejects(reader.read(notificationSession, query), {
        code: 'notifications_unavailable',
      });
    });

  await t.test(
    '429 stores full cooldown and clamps public retry without issuing automatic retries',
    async () => {
      status = 429;
      body = {secret: 'provider-profile'};

      const before = calls;

      await assert.rejects(reader.read(notificationSession, query), {
        code: 'retry_later',
        retryAfterSeconds: 60,
      });
      assert.equal(observedDelay, 120000);
      assert.equal(calls - before, 1);
      cooldown = new Date(clock.now() + 90000).toUTCString();
      await assert.rejects(reader.read(notificationSession, query), {
        code: 'retry_later',
        retryAfterSeconds: 60,
      });
      assert.equal(observedDelay, 90000);
    },
  );

  await t.test('429 cooldown survives absent or oversized error bodies', async () => {
    for (const body of [null, 'x'.repeat(1048577)]) {
      observedDelay = 0;

      const rateLimited = new OneSignalReadinessReader(
        'app-fixture',
        signer,
        budget,
        {fetch: async () => new Response(body, {status: 429, headers: {'retry-after': '120'}})},
        clock,
      );

      await assert.rejects(rateLimited.read(notificationSession, query), {
        code: 'retry_later',
        retryAfterSeconds: 60,
      });
      assert.equal(observedDelay, 120000);
    }
  });

  for (const value of [400, 401, 403, 500])
    await t.test(`provider ${value} is safe unavailable without retry`, async () => {
      status = value;

      const before = calls;

      await assert.rejects(reader.read(notificationSession, query), {
        code: 'notifications_unavailable',
        message: 'notifications_unavailable',
      });
      assert.equal(calls - before, 1);
    });

  await t.test('oversized streaming body rejected without reading a complete profile', async () => {
    const oversized = new OneSignalReadinessReader(
      'app-fixture',
      signer,
      budget,
      {fetch: async () => new Response('x'.repeat(1048577))},
      clock,
    );

    await assert.rejects(oversized.read(notificationSession, query), {
      code: 'notifications_unavailable',
    });
  });
  await t.test('timeout is bounded and cannot return previous success', async () => {
    const timeout = new OneSignalReadinessReader(
      'app-fixture',
      signer,
      budget,
      {
        fetch: (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () => reject(new Error('secret timeout'))),
          ),
      },
      clock,
    );
    const keepAlive = setTimeout(() => undefined, 5500);

    try {
      await assert.rejects(timeout.read(notificationSession, query), {
        code: 'notifications_unavailable',
      });
    } finally {
      clearTimeout(keepAlive);
    }

    body = original;
    status = 200;
    assert.equal(await reader.read(notificationSession, query), true);
    status = 500;
    await assert.rejects(reader.read(notificationSession, query), {
      code: 'notifications_unavailable',
    });
  });
});
