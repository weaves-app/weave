import assert from 'node:assert/strict';
import {test} from 'node:test';

import {JoseIdentityGrantSigner} from '../src/modules/notifications/infrastructure/jose-identity-grant-signer';
import {NotificationTestClock, notificationSession} from './notifications-fixtures';

void test('S11 ES256 identity grant contains only identity/issuer/expiry and never outlives bearer', async (t) => {
  const {generateKeyPair, exportPKCS8, jwtVerify} = await import('jose');
  const pair = await generateKeyPair('ES256', {extractable: true});
  const clock = new NotificationTestClock();
  const config = {appId: 'synthetic-app', privateKey: await exportPKCS8(pair.privateKey)};
  const signer = new JoseIdentityGrantSigner(config, clock);

  for (const remaining of [15, 16, 60, 1000])
    await t.test(`signs ${remaining} seconds with exact constrained claims`, async () => {
      const grant = await signer.sign({
        ...notificationSession,
        tokenExpiresAtSeconds: clock.now() / 1000 + remaining,
      });
      const verified = await jwtVerify(grant.token, pair.publicKey, {
        algorithms: ['ES256'],
        issuer: 'synthetic-app',
        currentDate: new Date(clock.now()),
      });

      assert.deepEqual(verified.payload, {
        iss: 'synthetic-app',
        exp: clock.now() / 1000 + Math.min(remaining, 300),
        identity: {external_id: 'user_test_a'},
      });
      assert.equal(grant.expiresAt, new Date(Number(verified.payload.exp) * 1000).toISOString());
      assert.equal(grant.externalId, 'user_test_a');
    });

  for (const remaining of [-1, 0, 14])
    await t.test(`remaining ${remaining} refuses signing with bounded retry`, async () => {
      await assert.rejects(
        signer.sign({
          ...notificationSession,
          tokenExpiresAtSeconds: clock.now() / 1000 + remaining,
        }),
        {code: 'notifications_unavailable', retryAfterSeconds: 5},
      );
    });

  await t.test('time advancing after session validation is counted at signing', async () => {
    clock.time = notificationSession.tokenExpiresAtSeconds * 1000 - 14000;
    await assert.rejects(signer.sign(notificationSession), {
      code: 'notifications_unavailable',
      retryAfterSeconds: 5,
    });
  });
  await t.test('invalid/missing key fails safely without leaking material', async () => {
    clock.time = 2000000000000;

    for (const privateKey of ['', 'PRIVATE-SECRET'])
      await assert.rejects(
        new JoseIdentityGrantSigner({...config, privateKey}, clock).sign(notificationSession),
        {code: 'notifications_unavailable', message: 'notifications_unavailable'},
      );
  });
});
