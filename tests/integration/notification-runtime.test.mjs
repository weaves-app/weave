import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {generateKeyPair, exportPKCS8, exportSPKI, SignJWT, jwtVerify} from 'jose';
import {NestFactory} from '@nestjs/core';
import pg from 'pg';

export const RUNTIME_HOST = '127.0.0.1';

void test('S11 compiled production authentication/grant/readiness composition with PostgreSQL and controlled providers', async (t) => {
  assert.ok(process.env.DATABASE_URL, 'Explicit local fixture DATABASE_URL required');
  assert.equal(new URL(process.env.DATABASE_URL).hostname, RUNTIME_HOST);

  const appId = randomUUID();
  const subscriptionId = randomUUID();
  const rsa = await generateKeyPair('RS256');
  const ec = await generateKeyPair('ES256', {extractable: true});
  const now = Math.floor(Date.now() / 1000);
  const account = 'user_runtime';
  const session = 'sess_runtime';
  const issuer = 'https://fixture.clerk.accounts.dev';

  Object.assign(process.env, {
    CLERK_SECRET_KEY: 'sk_test_synthetic',
    CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('fixture.clerk.accounts.dev$').toString('base64')}`,
    CLERK_EXPECTED_ISSUER: issuer,
    CLERK_JWT_KEY: await exportSPKI(rsa.publicKey),
    CLERK_AUDIENCE: '',
    CLERK_ALLOWED_ORIGINS: '',
    ONESIGNAL_APP_ID: appId,
    ONESIGNAL_IDENTITY_PRIVATE_KEY: await exportPKCS8(ec.privateKey),
    NOTIFICATION_BUDGET_HMAC_KEY: 'synthetic-hmac-secret-32-characters',
  });

  const token = await new SignJWT({
    iss: issuer,
    sub: account,
    sid: session,
    exp: now + 120,
    iat: now - 1,
    nbf: now - 1,
    sts: 'active',
  })
    .setProtectedHeader({alg: 'RS256', kid: 'synthetic-runtime', typ: 'JWT'})
    .sign(rsa.privateKey);
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  let enabled = true;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (new URL(url).hostname === RUNTIME_HOST) return originalFetch(input, init);

    if (url === `https://api.clerk.com/v1/sessions/${session}`)
      return Response.json({id: session, user_id: account, status: 'active'});

    assert.equal(url, `https://api.onesignal.com/apps/${appId}/users/by/external_id/${account}`);

    const grant = new Headers(init.headers).get('authorization').replace('Bearer ', '');
    const verified = await jwtVerify(grant, ec.publicKey, {algorithms: ['ES256'], issuer: appId});

    assert.deepEqual(verified.payload.identity, {external_id: account});
    providerCalls++;

    return Response.json({
      identity: {external_id: account},
      subscriptions: [
        {
          id: subscriptionId,
          type: 'AndroidPush',
          enabled,
          token: 'synthetic-push-token',
          app_id: appId,
        },
      ],
    });
  };

  const require = createRequire(import.meta.url);
  const {AppModule} = require('../../apps/api/dist/app.module.js');
  const {
    configureNotificationHttp,
  } = require('../../apps/api/dist/modules/notifications/presentation/notification-http.js');
  const app = await NestFactory.create(AppModule, {logger: false, bodyParser: false});
  const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

  t.after(async () => {
    await app.close();
    globalThis.fetch = originalFetch;
    await pool.query('DELETE FROM "NotificationRequestBudget" WHERE starts_with(key,$1)', [
      `app:${appId}:`,
    ]);
    await pool.end();
  });
  app.setGlobalPrefix('api');
  configureNotificationHttp(app);
  await app.listen(0, RUNTIME_HOST);

  const base = await app.getUrl();

  const post = (route, body) =>
    fetch(`${base}/api/notifications/${route}`, {
      method: 'POST',
      headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
      body: JSON.stringify(body),
    });

  const grant = await post('identity-grant', {});

  assert.equal(grant.status, 200);
  assert.equal(grant.headers.get('cache-control'), 'no-store');

  const issued = await grant.json();

  assert.equal(issued.externalId, account);
  assert.equal(
    (await jwtVerify(issued.token, ec.publicKey, {issuer: appId})).payload.exp,
    now + 120,
  );

  const ready = await post('readiness', {subscriptionId, platform: 'android'});

  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, 'ready');
  assert.equal(providerCalls, 1);

  const limited = await post('readiness', {subscriptionId, platform: 'android'});

  assert.equal(limited.status, 429);
  assert.equal(providerCalls, 1);
  await pool.query(
    'UPDATE "NotificationRequestBudget" SET "nextAllowedAt"=clock_timestamp()-interval \'1 second\' WHERE starts_with(key,$1)',
    [`app:${appId}:`],
  );
  enabled = false;

  const pending = await post('readiness', {subscriptionId, platform: 'android'});

  assert.equal(pending.status, 200);

  const observed = await pending.json();

  assert.equal(observed.status, 'pending');
  assert.equal(observed.validForSeconds, 0);
  assert.equal(providerCalls, 2);

  const spoof = await post('identity-grant', {accountId: 'other'});

  assert.equal(spoof.status, 400);
  assert.deepEqual(await spoof.json(), {code: 'invalid_request'});
});
