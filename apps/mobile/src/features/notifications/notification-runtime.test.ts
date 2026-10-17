import {createInitialAuthState} from '../../auth/application/auth-state-store';
import {createZustandAuthStateStore} from '../../auth/infrastructure/zustand-auth-state-store';
import {createNotificationRuntime} from './notification-runtime';
import {FakeClock, fakePlatform} from './testing/fakes';

const tick = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

test('S01/S03 runtime follows validated auth and clears on sign-out without modifying authentication', async () => {
  const auth = createZustandAuthStateStore(createInitialAuthState());
  const platform = fakePlatform();
  const runtime = createNotificationRuntime(auth, platform, new FakeClock(), 'root-a');

  auth.replace({
    ...auth.getState(),
    session: {
      status: 'active',
      generation: 1,
      revision: 1,
      validatedAt: 100,
      sessionId: 'session-a',
      accountId: 'account-a',
    },
  });

  const signedIn = auth.getState();

  await tick();
  expect(runtime.state.getState().status).toBe('permission-needed');
  await runtime.controller.enable();
  expect(auth.getState()).toBe(signedIn);
  auth.replace({...auth.getState(), session: {status: 'signedOut', generation: 2, revision: 2}});
  expect(runtime.state.getState().status).toBe('hidden');
  expect(platform.reconcile).toHaveBeenLastCalledWith(null, 'root-a', expect.any(Number));
  runtime.dispose();
});

test('S09 disposed root unsubscribes and cannot reconcile future auth changes', async () => {
  const auth = createZustandAuthStateStore(createInitialAuthState());
  const platform = fakePlatform();
  const runtime = createNotificationRuntime(auth, platform, new FakeClock(), 'root-a');

  await tick();
  runtime.dispose();
  jest.mocked(platform.reconcile).mockClear();
  auth.replace({
    ...auth.getState(),
    session: {
      status: 'active',
      generation: 1,
      revision: 1,
      validatedAt: 100,
      sessionId: 'session-a',
      accountId: 'account-a',
    },
  });
  await tick();
  expect(platform.reconcile).not.toHaveBeenCalled();
  expect(platform.release).toHaveBeenCalledTimes(1);
});

test('S04 logout begins by suspending notifications before native auth completion', async () => {
  const auth = createZustandAuthStateStore(createInitialAuthState());
  const platform = fakePlatform();
  const runtime = createNotificationRuntime(auth, platform, new FakeClock(), 'root-a');

  auth.replace({
    ...auth.getState(),
    session: {
      status: 'active',
      generation: 1,
      revision: 1,
      validatedAt: 100,
      sessionId: 'session-a',
      accountId: 'account-a',
    },
  });
  await tick();
  expect(runtime.state.getState().status).toBe('permission-needed');
  auth.replace({...auth.getState(), pending: true});
  expect(runtime.state.getState().status).toBe('hidden');
  expect(platform.reconcile).toHaveBeenLastCalledWith(null, 'root-a', expect.any(Number));
  auth.replace({...auth.getState(), pending: false});
  await tick();
  expect(runtime.state.getState().status).toBe('permission-needed');
  runtime.dispose();
});

test('S09 partial native acquisition and listener setup failures release the root', () => {
  for (const seam of ['acquire', 'observe'] as const) {
    const auth = createZustandAuthStateStore(createInitialAuthState());
    const platform = fakePlatform();

    platform[seam] = jest.fn(() => {
      throw new Error('setup failed');
    });
    expect(() => createNotificationRuntime(auth, platform, new FakeClock(), 'root-a')).toThrow(
      'setup failed',
    );
    expect(platform.release).toHaveBeenCalledWith('root-a');
  }
});

test('S09 native release still runs if listener cleanup throws', () => {
  const auth = createZustandAuthStateStore(createInitialAuthState());
  const platform = fakePlatform();

  platform.observe = () => () => {
    throw new Error('cleanup failed');
  };

  const runtime = createNotificationRuntime(auth, platform, new FakeClock(), 'root-a');

  expect(() => runtime.dispose()).toThrow('cleanup failed');
  expect(platform.release).toHaveBeenCalledWith('root-a');
});
