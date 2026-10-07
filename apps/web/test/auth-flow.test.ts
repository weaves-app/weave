import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Attempt, AuthGateway} from '../src/features/auth/application/contracts';
import {createAuthFlow} from '../src/features/auth/application/flow';

export function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    google: async () => {},
    current: () => ({stage: 'credentials'}),
    signup: async () => ({stage: 'verification'}),
    signin: async () => ({stage: 'ready', verified: true}),
    invite: async () => ({stage: 'ready', verified: true}),
    sendCode: async () => {},
    verify: async () => ({stage: 'ready', verified: true}),
    activate: async () => '/',
    deactivate: async () => {},
    ...overrides,
  };
}
const credentials = {email: 'person@example.test', password: 'secret-test-only'};
void test('WEA-10 S01 signup sends verification, never activates before correct code, then opens Home', async () => {
  let codes = 0;
  let activations = 0;
  const routes: string[] = [];
  const flow = createAuthFlow(
    gateway({
      sendCode: async () => {
        codes++;
      },
      activate: async () => {
        activations++;
        return '/';
      },
    }),
    {mode: 'signup', complete: (url) => routes.push(url)},
  );
  await flow.submit(credentials);
  assert.equal(flow.getSnapshot().stage, 'verification');
  assert.equal(codes, 1);
  assert.equal(activations, 0);
  await flow.verify('424242');
  assert.equal(activations, 1);
  assert.deepEqual(routes, ['/']);
  assert.equal(flow.getSnapshot().stage, 'complete');
});
void test('WEA-10 S01/S08 wrong or expired code is recoverable and resend can be retried', async () => {
  let attempts = 0;
  let codes = 0;
  const flow = createAuthFlow(
    gateway({
      verify: async () => {
        if (++attempts === 1) throw {code: 'form_code_incorrect'};
        return {stage: 'ready', verified: true};
      },
      sendCode: async () => {
        codes++;
      },
    }),
    {mode: 'signup', complete: () => {}},
  );
  await flow.submit(credentials);
  await flow.verify('bad');
  assert.equal(flow.getSnapshot().stage, 'verification');
  assert.match(flow.getSnapshot().error ?? '', /code/i);
  assert.equal(flow.getSnapshot().pending, false);
  await flow.resend();
  assert.equal(codes, 2);
  await flow.verify('correct');
  assert.equal(flow.getSnapshot().stage, 'complete');
});
void test('WEA-10 S01/S08 empty/malformed email and missing password/code make no provider calls', async () => {
  let calls = 0;
  const flow = createAuthFlow(
    gateway({
      signup: async () => {
        calls++;
        return {stage: 'verification'};
      },
    }),
    {mode: 'signup', complete: () => {}},
  );
  for (const input of [
    {email: '', password: 'x'},
    {email: 'bad', password: 'x'},
    {email: credentials.email, password: ''},
  ]) {
    await flow.submit(input);
    assert.ok(flow.getSnapshot().error);
  }
  assert.equal(calls, 0);
  await flow.submit(credentials);
  await flow.verify('');
  assert.match(flow.getSnapshot().error ?? '', /code/i);
});
void test('WEA-10 S01/S08 unverified provider completion or unsupported requirements cannot activate', async () => {
  for (const attempt of [{stage: 'ready', verified: false}, {stage: 'unsupported'}] as const) {
    let activations = 0;
    const flow = createAuthFlow(
      gateway({
        signup: async () => attempt,
        activate: async () => {
          activations++;
          return '/';
        },
      }),
      {mode: 'signup', complete: () => {}},
    );
    await flow.submit(credentials);
    assert.ok(flow.getSnapshot().error);
    assert.equal(activations, 0);
  }
});
void test('WEA-10 S02 password login and Device Trust verification both reach Home', async () => {
  for (const stage of ['ready', 'verification'] as const) {
    const routes: string[] = [];
    const flow = createAuthFlow(gateway({signin: async () => ({stage, verified: true})}), {
      mode: 'signin',
      complete: (url) => routes.push(url),
    });
    await flow.submit(credentials);
    if (stage === 'verification') await flow.verify('code');
    assert.deepEqual(routes, ['/']);
  }
});
void test('WEA-10 S07 interrupted verification restores without needing password again', async () => {
  const flow = createAuthFlow(gateway({current: () => ({stage: 'verification'})}), {
    mode: 'signup',
    complete: () => {},
  });
  assert.equal(flow.getSnapshot().stage, 'verification');
  await flow.verify('code');
  assert.equal(flow.getSnapshot().stage, 'complete');
});
void test('WEA-10 S08 duplicate/signup/invalid login/network/rejected-password errors finish loading', async () => {
  for (const code of [
    'form_identifier_exists',
    'form_password_incorrect',
    'network_error',
    'form_password_pwned',
  ]) {
    const flow = createAuthFlow(
      gateway({
        signup: async () => {
          throw {errors: [{code}]};
        },
      }),
      {mode: 'signup', complete: () => {}},
    );
    await flow.submit(credentials);
    assert.ok(flow.getSnapshot().error);
    assert.equal(flow.getSnapshot().pending, false);
    assert.equal(flow.getSnapshot().stage, 'credentials');
  }
});
void test('WEA-10 S08 repeated submits issue one mutation and cancellation prevents late activation', async () => {
  let calls = 0;
  let activate = 0;
  let resolve: (value: Attempt) => void = () => {};
  const result = new Promise<Attempt>((done) => {
    resolve = done;
  });
  const flow = createAuthFlow(
    gateway({
      signin: async () => {
        calls++;
        return result;
      },
      activate: async () => {
        activate++;
        return '/';
      },
    }),
    {mode: 'signin', complete: () => assert.fail('cancelled navigation')},
  );
  const pending = flow.submit(credentials);
  await flow.submit(credentials);
  assert.equal(calls, 1);
  assert.equal(flow.getSnapshot().pending, true);
  flow.cancel();
  resolve({stage: 'ready', verified: true});
  await pending;
  assert.equal(activate, 0);
});
void test('WEA-10 S07/S08 cancellation during activation clears late session and never navigates', async () => {
  let release: (value: string) => void = () => {};
  let clear = 0;
  let started = false;
  const active = new Promise<string>((done) => {
    release = done;
  });
  const flow = createAuthFlow(
    gateway({
      activate: () => {
        started = true;
        return active;
      },
      deactivate: async () => {
        clear++;
      },
    }),
    {mode: 'signin', complete: () => assert.fail('late navigation')},
  );
  const result = flow.submit(credentials);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(started, true);
  flow.cancel();
  release('/');
  await result;
  assert.equal(clear, 1);
});
void test('WEA-10 S07 signout awaits provider, clears state and reports recoverable failure', async () => {
  let clear = 0;
  const flow = createAuthFlow(
    gateway({
      deactivate: async () => {
        if (++clear === 1) throw new Error('offline');
      },
    }),
    {mode: 'signin', complete: () => {}},
  );
  await flow.signOut();
  assert.ok(flow.getSnapshot().error);
  await flow.signOut();
  assert.equal(clear, 2);
  assert.equal(flow.getSnapshot().error, null);
});
void test('WEA-10 S03 invitation signup supplies only ticket/password and reaches intended Home', async () => {
  const calls: unknown[] = [];
  const routes: string[] = [];
  const flow = createAuthFlow(
    gateway({
      invite: async (...args) => {
        calls.push(args);
        return {stage: 'ready', verified: true};
      },
      signup: async () => assert.fail('ordinary signup fallback'),
    }),
    {mode: 'invitation', ticket: 'recipient-ticket', complete: (url) => routes.push(url)},
  );
  await flow.submit({email: 'substitute@example.test', password: credentials.password});
  assert.deepEqual(calls, [['recipient-ticket', credentials.password]]);
  assert.deepEqual(routes, ['/']);
});
void test('WEA-10 S03/S08 missing/expired/reused invitation keeps context and never falls back', async () => {
  let publicCalls = 0;
  let invites = 0;
  const port = gateway({
    invite: async () => {
      invites++;
      throw {code: 'ticket_invalid'};
    },
    signup: async () => {
      publicCalls++;
      return {stage: 'ready'};
    },
  });
  const missing = createAuthFlow(port, {mode: 'invitation', complete: () => assert.fail()});
  await missing.submit(credentials);
  assert.equal(invites, 0);
  assert.ok(missing.getSnapshot().error);
  const expired = createAuthFlow(port, {
    mode: 'invitation',
    ticket: 'expired',
    complete: () => assert.fail(),
  });
  await expired.submit(credentials);
  await expired.submit(credentials);
  assert.equal(invites, 2);
  assert.equal(publicCalls, 0);
  assert.match(expired.getSnapshot().error ?? '', /invitation/i);
});

void test('WEA-10 S03/S08 failed invitation activation can retry without replaying the consumed ticket', async () => {
  let invitations = 0;
  let activations = 0;
  let completed = 0;
  const flow = createAuthFlow(
    gateway({
      invite: async () => {
        invitations++;
        return {stage: 'ready', verified: true};
      },
      activate: async () => {
        if (++activations === 1) throw new Error('offline');
        return '/';
      },
    }),
    {
      mode: 'invitation',
      ticket: 'one-use',
      complete: () => {
        completed++;
      },
    },
  );
  await flow.submit(credentials);
  assert.equal(flow.getSnapshot().stage, 'ready');
  await flow.submit({email: '', password: ''});
  assert.equal(completed, 1);
  assert.equal(invitations, 1);
  assert.equal(activations, 2);
});
void test('WEA-10 S08 timeout finishes loading and blocks late authentication activation', async () => {
  let release: (value: Attempt) => void = () => {};
  let activations = 0;
  const pending = new Promise<Attempt>((done) => {
    release = done;
  });
  const flow = createAuthFlow(
    gateway({
      signin: () => pending,
      activate: async () => {
        activations++;
        return '/';
      },
    }),
    {mode: 'signin', timeoutMilliseconds: 5, complete: () => assert.fail('timed out navigation')},
  );
  const submitted = flow.submit(credentials);
  await new Promise((done) => setTimeout(done, 15));
  assert.equal(flow.getSnapshot().pending, false);
  assert.match(flow.getSnapshot().error ?? '', /timed out/i);
  release({stage: 'ready', verified: true});
  await submitted;
  assert.equal(activations, 0);
});
