import {createAuthRuntime} from './auth-runtime';
import {createInitialAuthState} from './application/auth-state-store';
import {createZustandAuthStateStore} from './infrastructure/zustand-auth-state-store';
import type {AuthViewState, AuthResult, SessionSnapshot} from './domain/auth-models';

import {active, deferred, TestClock, TestGateway} from './testing/fakes';

test('WEA-27 S05/S07 disposing runtime closes its store and releases gateway exactly once', async () => {
  const gateway = new TestGateway();
  const store = createZustandAuthStateStore(createInitialAuthState());
  const runtime = createAuthRuntime(gateway, new TestClock(), () => store);
  const dispose = jest.spyOn(gateway, 'dispose');

  await runtime.controller.start();

  const before = store.getState();

  runtime.dispose();
  runtime.dispose();
  store.replace({...before, pending: true});
  expect(gateway.disposed).toBe(true);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(store.getState()).toBe(before);
  expect(runtime.state).not.toHaveProperty('replace');
});

test('WEA-27 S05 factory failure releases an already acquired gateway', () => {
  const gateway = new TestGateway();

  expect(() =>
    createAuthRuntime(gateway, new TestClock(), () => {
      throw new Error('allocation failed');
    }),
  ).toThrow('allocation failed');
  expect(gateway.disposed).toBe(true);
});

test('WEA-27 S01 initial lifetimes are fresh and resolve only through their own gateway', async () => {
  const firstGateway = new TestGateway();
  const secondGateway = new TestGateway();

  firstGateway.resolveResult = async (context) => active(context);

  const first = createAuthRuntime(firstGateway, new TestClock());
  const second = createAuthRuntime(secondGateway, new TestClock());

  expect(first.state.getState()).toEqual({
    session: {status: 'resolving', generation: 0, revision: 0},
    attempt: {method: 'password', stage: 'idle'},
    pending: false,
  });
  expect(first.state.getState()).not.toBe(second.state.getState());
  expect(first.state.getState().session).not.toBe(second.state.getState().session);
  expect(firstGateway.requests).toHaveLength(0);
  await first.controller.start();
  expect(first.state.getState().session.status).toBe('active');
  expect(second.state.getState().session.status).toBe('resolving');
  first.dispose();
  second.dispose();
});

test('WEA-27 S07 restart discards pending secrets and revalidates native session', async () => {
  const gateway = new TestGateway();
  const pending = deferred<AuthResult>();

  gateway.loginResult = () => pending.promise;

  const first = createAuthRuntime(gateway, new TestClock());
  const seen: AuthViewState[] = [];

  first.state.subscribe(() => seen.push(first.state.getState()));
  await first.controller.start();

  const login = first.controller.login('password', 'private-email@example.com', 'private-password');

  expect(first.state.getState().pending).toBe(true);
  first.dispose();
  await login;

  const oldSnapshot = first.state.getState();
  const restored = new TestGateway();
  const resolution = deferred<SessionSnapshot>();

  restored.resolveResult = () => resolution.promise;

  const fresh = createAuthRuntime(restored, new TestClock());
  const start = fresh.controller.start();

  expect(fresh.state.getState().session.status).toBe('resolving');
  expect(fresh.state.getState()).toMatchObject({attempt: {stage: 'idle'}, pending: false});
  expect(fresh.state.getState().error).toBeUndefined();

  const old = gateway.requests[1]?.input;
  const current = restored.requests[0]?.input;

  if (!old || !current) throw new Error('missing operation');

  pending.resolve(active(old));
  await Promise.resolve();
  expect(first.state.getState()).toBe(oldSnapshot);
  expect(fresh.state.getState().session.status).toBe('resolving');
  resolution.resolve(active(current));
  await start;
  expect(fresh.state.getState().session.status).toBe('active');
  expect(JSON.stringify(seen)).not.toContain('private-password');
  expect(JSON.stringify(seen)).not.toContain('private-email@example.com');
  fresh.dispose();
});
