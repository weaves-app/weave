import {createAuthController} from './application/auth-controller';
import {active, deferred, signedOut, TestClock, TestGateway} from './testing/fakes';
import type {AuthResult, SessionSnapshot} from './domain/auth-models';
function requestContext(gateway: TestGateway, index: number) {
  const input = gateway.requests[index]?.input;
  if (!input) throw new Error('Missing request');
  return input;
}
afterEach(() => jest.useRealTimers());
test('S05 hides routes until fresh resolution completes, then restores valid Home', async () => {
  const gateway = new TestGateway();
  const result = deferred<SessionSnapshot>();
  gateway.resolveResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  const ready = controller.start();
  expect(controller.getSnapshot().session.status).toBe('resolving');
  const context = gateway.requests[0]?.input;
  expect(context).toBeDefined();
  if (!context) throw new Error('missing resolve context');
  result.resolve(active(context));
  await ready;
  expect(controller.getSnapshot().session.status).toBe('active');
});
test('S04 initialization deadline fails closed and allows a fresh retry', async () => {
  jest.useFakeTimers();
  const gateway = new TestGateway();
  gateway.resolveResult = () => new Promise(() => undefined);
  const controller = createAuthController(gateway, new TestClock());
  const ready = controller.start();
  await jest.advanceTimersByTimeAsync(30_000);
  await ready;
  expect(controller.getSnapshot().session.status).toBe('unavailable');
  expect(controller.getSnapshot().error?.code).toBe('timeout');
  gateway.resolveResult = async (input) => signedOut(input);
  await controller.refresh();
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
test('S07 ignores old revisions but removes access on ordered revocation', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input, 3);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const generation = controller.getSnapshot().session.generation;
  gateway.emit({status: 'signedOut', generation, revision: 2});
  expect(controller.getSnapshot().session.status).toBe('active');
  gateway.emit({status: 'signedOut', generation, revision: 4});
  expect(controller.getSnapshot().session.status).toBe('signedOut');
  gateway.emit(active({generation: generation - 1, operationId: 'old'}, 10));
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
test('S05 foreground validation hides protected content while rechecking', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  controller.setForeground(false);
  gateway.resolveResult = () => new Promise(() => undefined);
  controller.setForeground(true);
  expect(controller.getSnapshot().session.status).toBe('resolving');
  controller.dispose();
});
test('S07 disposal abandons pending resolution and prevents late activation', async () => {
  const gateway = new TestGateway();
  const result = deferred<SessionSnapshot>();
  gateway.resolveResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  const ready = controller.start();
  const context = gateway.requests[0]?.input;
  expect(context).toBeDefined();
  if (!context) throw new Error('missing context');
  controller.dispose();
  result.resolve(active(context));
  await ready;
  expect(controller.getSnapshot().session.status).not.toBe('active');
  expect(gateway.disposed).toBe(true);
  expect(gateway.abandoned).toContainEqual(context);
});
test.each(['password', 'emailCode', 'google'] as const)(
  'S02 completes %s and publishes active only from gateway result',
  async (method) => {
    const gateway = new TestGateway();
    const controller = createAuthController(gateway, new TestClock());
    await controller.start();
    await controller.login(method, ' person@example.com ', 'password ');
    expect(gateway.requests.map((request) => request.method)).toContain(
      method === 'emailCode' ? 'requestCode' : method,
    );
    expect(controller.getSnapshot().session.status).toBe('active');
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('password ');
  },
);
test('S03 validates input without trimming password or retaining secrets', async () => {
  const gateway = new TestGateway();
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  await controller.login('password', 'broken', '');
  expect(controller.getSnapshot().error?.code).toBe('invalidInput');
  expect(gateway.requests).toHaveLength(1);
  await controller.login('password', ' person@example.com ', ' password ');
  expect(gateway.requests[1]?.input).toMatchObject({
    email: 'person@example.com',
    password: ' password ',
  });
});
test('S08 duplicate cross-method submissions send one request', async () => {
  const gateway = new TestGateway();
  const result = deferred<AuthResult>();
  gateway.loginResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.login('password', 'person@example.com', 'password');
  await controller.login('google');
  expect(gateway.requests).toHaveLength(2);
  expect(controller.getSnapshot().pending).toBe(true);
  result.resolve(active(requestContext(gateway, 1)));
  await ready;
});
test.each(['signIn', 'deviceTrust'] as const)(
  'S16/S19 keeps opaque %s challenge across verify and resend generations',
  async (codePurpose) => {
    const gateway = new TestGateway();
    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'opaque', codePurpose});
    const controller = createAuthController(gateway, new TestClock());
    await controller.start();
    await controller.login(
      codePurpose === 'deviceTrust' ? 'password' : 'emailCode',
      'person@example.com',
      'password',
    );
    expect(controller.getSnapshot().attempt.stage).toBe('awaitingCode');
    await controller.resend();
    expect(gateway.requests.at(-1)?.input).toMatchObject({attemptId: 'opaque', codePurpose});
    gateway.loginResult = async (input) => active(input);
    await controller.verify('123456');
    expect(gateway.requests.at(-1)?.input).toMatchObject({
      attemptId: 'opaque',
      code: '123456',
      codePurpose,
    });
    expect(controller.getSnapshot().session.status).toBe('active');
  },
);
test.each([
  'existingAccountRequired',
  'verificationRequired',
  'cancelled',
  'codeExpired',
  'rateLimited',
] as const)('S17/S18/S20 handles %s without unlocking Home', async (code) => {
  const gateway = new TestGateway();
  gateway.loginResult = async () => ({kind: 'error', code, messageKey: code});
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  await controller.login('google');
  expect(controller.getSnapshot().error?.code).toBe(code);
  expect(controller.getSnapshot().session.status).toBe('signedOut');
  controller.selectMethod('password');
  expect(controller.getSnapshot().attempt.stage).toBe('idle');
  expect(controller.getSnapshot().error).toBeUndefined();
});
test('S08 method switch abandons pending work and ignores late activation', async () => {
  const gateway = new TestGateway();
  const result = deferred<AuthResult>();
  gateway.loginResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.login('google');
  const old = requestContext(gateway, 1);
  controller.selectMethod('password');
  result.resolve(active(old));
  await ready;
  expect(gateway.abandoned).toContainEqual(old);
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
test('S04 password times out after30seconds and abandons native work', async () => {
  jest.useFakeTimers();
  const gateway = new TestGateway();
  gateway.loginResult = () => new Promise(() => undefined);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.login('password', 'person@example.com', 'password');
  await jest.advanceTimersByTimeAsync(30_000);
  await ready;
  expect(controller.getSnapshot().error?.code).toBe('timeout');
  expect(controller.getSnapshot().pending).toBe(false);
  expect(gateway.abandoned).toContainEqual({
    generation: requestContext(gateway, 1).generation,
    operationId: requestContext(gateway, 1).operationId,
  });
});
test('S17 Google deadline counts120seconds in foreground and resumes without replacing its operation', async () => {
  jest.useFakeTimers();
  const gateway = new TestGateway();
  gateway.loginResult = () => new Promise(() => undefined);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.login('google');
  await jest.advanceTimersByTimeAsync(60_000);
  controller.setForeground(false);
  await jest.advanceTimersByTimeAsync(180_000);
  expect(controller.getSnapshot().pending).toBe(true);
  controller.setForeground(true);
  await jest.advanceTimersByTimeAsync(60_000);
  await ready;
  expect(controller.getSnapshot().error?.code).toBe('timeout');
  expect(gateway.requests).toHaveLength(2);
});
test('S09/S11 logout prevents duplicates and removes the active session on confirmed clear', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  const result = deferred<SessionSnapshot>();
  gateway.signOutResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.logout();
  await controller.logout();
  expect(gateway.requests.filter((request) => request.method === 'signOut')).toHaveLength(1);
  expect(controller.getSnapshot().pending).toBe(true);
  const input = gateway.requests.at(-1)?.input;
  if (!input) throw new Error('missing signout');
  result.resolve(signedOut(input));
  await ready;
  expect(controller.getSnapshot().session.status).toBe('signedOut');
  expect(controller.getSnapshot().pending).toBe(false);
});
test.each(['active', 'signedOut', 'unavailable'] as const)(
  'S10 logout partial failure truthfully reports %s',
  async (status) => {
    const gateway = new TestGateway();
    gateway.resolveResult = async (input) => active(input);
    gateway.signOutResult = async (input) => ({
      ...(status === 'active' ? active(input) : signedOut(input)),
      status,
      error: {code: 'network', messageKey: 'network'},
    });
    const controller = createAuthController(gateway, new TestClock());
    await controller.start();
    await controller.logout();
    expect(controller.getSnapshot().session.status).toBe(status);
    expect(controller.getSnapshot().error?.code).toBe('network');
    expect(controller.getSnapshot().pending).toBe(false);
  },
);
test('S10 logout deadline hides uncertain protected access until revalidation', async () => {
  jest.useFakeTimers();
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = () => new Promise(() => undefined);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.logout();
  await jest.advanceTimersByTimeAsync(30_000);
  await ready;
  expect(controller.getSnapshot().session.status).toBe('unavailable');
  expect(controller.getSnapshot().error?.code).toBe('timeout');
});
test.each(['signIn', 'deviceTrust'] as const)(
  'S05/S16/S19 foreground revalidation preserves idle %s challenge for resend and verify',
  async (codePurpose) => {
    const gateway = new TestGateway();
    gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'live', codePurpose});
    const controller = createAuthController(gateway, new TestClock());
    await controller.start();
    await controller.login(
      codePurpose === 'signIn' ? 'emailCode' : 'password',
      'person@example.com',
      'password',
    );
    const challengeContext = requestContext(gateway, 1);
    controller.setForeground(false);
    controller.setForeground(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(gateway.abandoned).not.toContainEqual(challengeContext);
    expect(controller.getSnapshot().attempt.attemptId).toBe('live');
    gateway.loginResult = async (input) =>
      gateway.abandoned.some((item) => item.generation === challengeContext.generation)
        ? {kind: 'error', code: 'cancelled', messageKey: 'cancelled'}
        : active(input);
    await controller.verify('123456');
    expect(controller.getSnapshot().session.status).toBe('active');
  },
);
test('S04 timed-out verification discards the abandoned opaque challenge and restores method selection', async () => {
  jest.useFakeTimers();
  const gateway = new TestGateway();
  gateway.loginResult = async () => ({kind: 'challenge', attemptId: 'live', codePurpose: 'signIn'});
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  await controller.login('emailCode', 'person@example.com');
  gateway.loginResult = () => new Promise(() => undefined);
  const ready = controller.verify('123456');
  await jest.advanceTimersByTimeAsync(30_000);
  await ready;
  expect(controller.getSnapshot().attempt.attemptId).toBeUndefined();
  expect(controller.getSnapshot().error?.code).toBe('timeout');
  const count = gateway.requests.length;
  await controller.resend();
  expect(gateway.requests).toHaveLength(count);
});
test('S09/S10 foreground does not supersede an in-flight logout reconciliation', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  const result = deferred<SessionSnapshot>();
  gateway.signOutResult = () => result.promise;
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const ready = controller.logout();
  const input = gateway.requests.at(-1)?.input;
  if (!input) throw new Error('missinglogout');
  controller.setForeground(false);
  controller.setForeground(true);
  expect(gateway.requests.filter((request) => request.method === 'resolve')).toHaveLength(1);
  result.resolve(signedOut(input));
  await ready;
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
test('S07 equal revision callbacks cannot reverse a revocation', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  const generation = controller.getSnapshot().session.generation;
  gateway.emit({status: 'signedOut', generation, revision: 2});
  gateway.emit(active({generation, operationId: 'duplicate'}, 2));
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
test('S10 unavailable command outcome at revision zero fails closed during logout', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = async (input) => ({
    status: 'unavailable',
    generation: input.generation,
    revision: 0,
    error: {code: 'unexpected', messageKey: 'unexpected'},
  });
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  await controller.logout();
  expect(controller.getSnapshot().session.status).toBe('unavailable');
  expect(controller.getSnapshot().error?.code).toBe('unexpected');
});
test('S10 malformed logout failure overrides a higher revision intermediate active event', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = async (input) => {
    gateway.emit(active(input, 3));
    return {
      status: 'unavailable',
      generation: input.generation,
      revision: 0,
      error: {code: 'unexpected', messageKey: 'unexpected'},
    };
  };
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  await controller.logout();
  expect(controller.getSnapshot().session.status).toBe('unavailable');
});
test('S04 subscription initialization failure mounts unavailable without a rejected startup promise', async () => {
  const gateway = new TestGateway();
  gateway.subscribe = () => {
    throw new Error('synthetic-native-subscription-fault');
  };
  const controller = createAuthController(gateway, new TestClock());
  await expect(controller.start()).resolves.toBeUndefined();
  expect(controller.getSnapshot().session.status).toBe('unavailable');
  expect(controller.getSnapshot().error?.code).toBe('unexpected');
});
test('S04/S07 retry after subscription failure reinstalls invalidation before granting Home', async () => {
  const gateway = new TestGateway();
  const subscribe = gateway.subscribe.bind(gateway);
  let failing = true;
  gateway.subscribe = (listener) => {
    if (failing) throw new Error('subscription-fault');
    return subscribe(listener);
  };
  gateway.resolveResult = async (input) => active(input);
  const controller = createAuthController(gateway, new TestClock());
  await controller.start();
  failing = false;
  await controller.refresh();
  expect(controller.getSnapshot().session.status).toBe('active');
  gateway.emit({
    status: 'signedOut',
    generation: controller.getSnapshot().session.generation,
    revision: 2,
  });
  expect(controller.getSnapshot().session.status).toBe('signedOut');
});
