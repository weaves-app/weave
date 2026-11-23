import assert from 'node:assert/strict';
import {test} from 'node:test';

export const CLERK_TEST_OK = 200;

void test('S11 real Clerk signature validation plus live session authority', async (t) => {
  const {generateKeyPair, exportSPKI, SignJWT} = await import('jose');
  const keys = await generateKeyPair('RS256');
  const now = Math.floor(Date.now() / 1000);
  const base = {
    sub: 'user_synthetic',
    sid: 'sess_synthetic',
    iss: 'https://fixture.clerk.accounts.dev',
    exp: now + 120,
    nbf: now - 1,
    iat: now - 1,
    sts: 'active',
  };
  const config = {
    secretKey: 'sk_test_synthetic',
    publishableKey: `pk_test_${Buffer.from('fixture.clerk.accounts.dev$').toString('base64')}`,
    issuer: base.iss,
    allowedOrigins: ['https://weave.test'],
    jwtKey: await exportSPKI(keys.publicKey),
  };
  let session: Record<string, unknown> = {
    object: 'session',
    id: base.sid,
    user_id: base.sub,
    status: 'active',
    expire_at: Date.now() + 100000,
  };
  let fetchStatus = 200;
  let calls = 0;
  let hang = false;
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    if (hang)
      return new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('synthetic timeout'))),
      );

    calls++;
    assert.equal(String(input), 'https://api.clerk.com/v1/sessions/sess_synthetic');

    return Response.json(
      fetchStatus === CLERK_TEST_OK
        ? session
        : {errors: [{code: 'fixture', message: 'provider-secret'}]},
      {status: fetchStatus},
    );
  };
  t.after(() => {
    globalThis.fetch = original;
  });

  const token = (claims: Record<string, unknown> = {}) =>
    new SignJWT({...base, ...claims})
      .setProtectedHeader({alg: 'RS256', typ: 'JWT', kid: 'synthetic-key'})
      .sign(keys.privateKey);

  const {ClerkSessionAuthenticator} =
    await import('../src/modules/authentication/infrastructure/clerk-session-authenticator.js');
  const auth = new ClerkSessionAuthenticator(config);

  await t.test(
    'native bearer without azp and permitted web azp derive account and expiry',
    async () => {
      assert.deepEqual(await auth.authenticate(await token()), {
        accountId: base.sub,
        sessionId: base.sid,
        tokenExpiresAtSeconds: base.exp,
      });
      assert.equal(
        (await auth.authenticate(await token({azp: 'https://weave.test'}))).accountId,
        base.sub,
      );
    },
  );

  for (const [label, claims] of Object.entries({
    issuer: {iss: 'https://wrong.test'},
    emptySubject: {sub: ''},
    emptySession: {sid: ''},
    numericSession: {sid: 42},
    expired: {exp: now - 1},
    future: {nbf: now + 60},
    pending: {sts: 'pending'},
    unknownStatus: {sts: 'unexpected'},
    origin: {azp: 'https://evil.test'},
    malformedOrigin: {azp: 5},
  })) {
    await t.test(`rejects ${label} before live lookup`, async () => {
      const before = calls;

      await assert.rejects(auth.authenticate(await token(claims)), {
        code: 'authentication_required',
      });
      assert.equal(calls, before);
    });
  }

  await t.test('invalid signature and machine bearer rejected', async () => {
    const other = await generateKeyPair('RS256');
    const wrong = await new SignJWT(base)
      .setProtectedHeader({alg: 'RS256', kid: 'synthetic-key'})
      .sign(other.privateKey);

    await assert.rejects(auth.authenticate(wrong), {code: 'authentication_required'});
    await assert.rejects(auth.authenticate('mt_synthetic'), {code: 'authentication_required'});
  });
  await t.test('configured audience is mandatory and must match', async () => {
    const withAudience = new ClerkSessionAuthenticator({...config, audience: 'weave-api'});

    for (const aud of [undefined, 'wrong', [], 42])
      await assert.rejects(withAudience.authenticate(await token({aud})), {
        code: 'authentication_required',
      });

    assert.equal(
      (await withAudience.authenticate(await token({aud: 'weave-api'}))).accountId,
      base.sub,
    );
  });

  for (const status of ['pending', 'revoked', 'ended', 'expired', 'unexpected'])
    await t.test(`live ${status} session is rejected`, async () => {
      session = {...session, status};
      await assert.rejects(auth.authenticate(await token()), {code: 'authentication_required'});
    });

  await t.test('live ownership and session ID must match', async () => {
    session = {...session, status: 'active', user_id: 'other'};
    await assert.rejects(auth.authenticate(await token()), {code: 'authentication_required'});
    session = {...session, user_id: base.sub, id: 'other'};
    await assert.rejects(auth.authenticate(await token()), {code: 'authentication_required'});
  });
  await t.test('live lookup is bounded at five seconds and fails unavailable', async () => {
    hang = true;

    const result = await Promise.race([
      auth.authenticate(await token()).then(
        () => 'accepted',
        (error: unknown) =>
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : 'wrong-error',
      ),
      new Promise((resolve) => setTimeout(() => resolve('unbounded'), 5200)),
    ]);

    hang = false;
    assert.equal(result, 'authentication_unavailable');
  });
  await t.test(
    'missing trusted public key is unavailable without key-discovery retries',
    async () => {
      const before = calls;

      await assert.rejects(
        new ClerkSessionAuthenticator({...config, jwtKey: undefined}).authenticate(await token()),
        {code: 'authentication_unavailable'},
      );
      assert.equal(calls, before);
    },
  );
  await t.test(
    'missing session is unauthorized but provider outages/config faults unavailable',
    async () => {
      fetchStatus = 404;
      await assert.rejects(auth.authenticate(await token()), {code: 'authentication_required'});

      for (const status of [401, 403, 429, 500]) {
        fetchStatus = status;
        await assert.rejects(auth.authenticate(await token()), {
          code: 'authentication_unavailable',
        });
      }
    },
  );
});
