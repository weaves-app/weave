import type {AuthViewState, AuthResult, SessionSnapshot} from './domain/auth-models';
import {createInitialAuthState} from './application/auth-state-store';
import type {AuthStateStore} from './application/auth-state-store';
import {createZustandAuthStateStore} from './infrastructure/zustand-auth-state-store';

import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

import {SESSION_STATUS} from './domain/auth-models';

export const FIRST_MOUNT = 1;

export const ROOT_RESET_COUNT = 20;

export const RESTART_STAGE = {ACTIVE: 'active', VERIFICATION: 'verification'} as const;

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';

import {App} from '../../App';
import {createAuthRuntime} from './auth-runtime';
import {active, signedOut, deferred, TestClock, TestGateway} from './testing/fakes';

afterEach(() => jest.restoreAllMocks());

test.each(['active', 'signedOut', 'unavailable'] as const)(
  'S12/S13 provider failure Reload freshly resolves %s without old routes',
  async (status) => {
    const diagnostic = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const gateway = new TestGateway();

    gateway.resolveResult = async (input) =>
      status === SESSION_STATUS.ACTIVE
        ? active(input)
        : {status, generation: input.generation, revision: 1};

    let fail = true;

    render(
      <App
        createRuntime={() => {
          if (fail) throw new Error('seed-sensitive-error');

          return createAuthRuntime(gateway, new TestClock());
        }}
      />,
    );
    expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
    expect(screen.queryByText(/seed-sensitive-error/)).toBeNull();
    fail = false;
    fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
    await waitFor(() => expect(gateway.requests).toHaveLength(1));
    expect(gateway.requests[0]?.method).toBe('resolve');
    await waitFor(() =>
      expect(
        status === SESSION_STATUS.ACTIVE
          ? screen.getByText('Home')
          : status === SESSION_STATUS.SIGNED_OUT
            ? screen.getByText('Welcome back')
            : screen.getByRole('button', {name: 'Try again'}),
      ).toBeTruthy(),
    );
    diagnostic.mockRestore();
  },
);

test('S14 persistent provider failure returns Reload without an automatic retry loop', () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const factory = jest.fn(() => {
    throw new Error('persistent-provider-failure');
  });

  render(<App createRuntime={factory} />);
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();

  const before = factory.mock.calls.length;

  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(factory.mock.calls.length).toBeGreaterThan(before);

  const settled = factory.mock.calls.length;

  expect(factory.mock.calls.length).toBe(settled);
});

test('S13 a mounted auth failure disposes old subscriptions and prevents late old-root activation after Reload', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const first = new TestGateway();

  first.resolveResult = async (input) => active(input);

  const second = new TestGateway();
  let fault = false;
  let roots = 0;
  const clock = new TestClock();
  const runtime = createAuthRuntime(first, clock);

  render(
    <App
      createRuntime={() => {
        roots++;

        return roots === FIRST_MOUNT
          ? {
              ...runtime,
              state: {
                ...runtime.state,

                getState: () => {
                  if (fault) throw new Error('auth-state-render-fault');

                  return runtime.state.getState();
                },
              },
            }
          : createAuthRuntime(second, clock);
      }}
    />,
  );
  await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

  const old = first.requests[0]?.input;

  if (!old) throw new Error('missing first context');

  act(() => {
    fault = true;
    first.emit(active(old, 2));
  });
  expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
  expect(first.disposed).toBe(true);
  expect(first.abandoned).toContainEqual(old);
  fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
  await waitFor(() => expect(screen.getByText('Welcome back')).toBeTruthy());
  act(() => first.emit(active(old, 3)));
  expect(screen.queryByText('Home')).toBeNull();
  expect(second.requests[0]?.input.generation).toBeGreaterThan(old.generation);
});

test('WEA-27 S05 twenty Reloads close old stores and reject old native callbacks', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const clock = new TestClock();
  const gateways: TestGateway[] = [];
  const stores: AuthStateStore[] = [];
  let fault = false;
  let updates = 0;

  const factory = () => {
    const gateway = new TestGateway();
    const store = createZustandAuthStateStore(createInitialAuthState());

    gateway.resolveResult = async (input) => active(input);
    gateways.push(gateway);
    stores.push(store);
    store.subscribe(() => updates++);

    const runtime = createAuthRuntime(gateway, clock, () => store);

    return {
      ...runtime,
      state: {
        ...runtime.state,

        getState: () => {
          if (fault) throw new Error('controlled render failure');

          return runtime.state.getState();
        },
      },
    };
  };

  const view = render(<App createRuntime={factory} />);

  for (let reset = 0; reset < ROOT_RESET_COUNT; reset++) {
    await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

    const oldGateway = gateways[reset];
    const oldStore = stores[reset];
    const old = oldGateway?.requests[0]?.input;

    if (!oldGateway || !oldStore || !old) throw new Error('missing root');

    act(() => {
      fault = true;
      oldGateway.emit(active(old, 2));
    });
    expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy();
    expect(oldGateway.disposed).toBe(true);
    fault = false;
    fireEvent.press(screen.getByRole('button', {name: 'Reload'}));
    await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

    const freshStore = stores[reset + 1];
    const snapshot = freshStore?.getState();
    const before = updates;

    act(() => {
      oldGateway.emit(active(old, 999));
      oldStore.replace({...oldStore.getState(), pending: true});
    });
    expect(freshStore?.getState()).toBe(snapshot);
    expect(updates).toBe(before);
  }

  expect(gateways).toHaveLength(21);
  view.unmount();
  expect(gateways.every((gateway) => gateway.disposed)).toBe(true);
});

test.each(['verification', 'active'] as const)(
  'WEA-27 S07 restarting from %s gates Home on fresh native authority',
  async (stage) => {
    const clock = new TestClock();
    const previousGateway = new TestGateway();

    if (stage === RESTART_STAGE.ACTIVE)
      previousGateway.resolveResult = async (input) => active(input);
    else
      previousGateway.loginResult = async () => ({
        kind: 'challenge',
        attemptId: 'old-attempt',
        codePurpose: 'signIn',
      });

    const previous = createAuthRuntime(previousGateway, clock);
    const seen: AuthViewState[] = [];

    previous.state.subscribe(() => seen.push(previous.state.getState()));

    const initial = render(<App createRuntime={() => previous} />);

    await waitFor(() =>
      expect(
        screen.getByText(stage === RESTART_STAGE.ACTIVE ? 'Home' : 'Welcome back'),
      ).toBeTruthy(),
    );

    const verification = deferred<AuthResult>();
    let pendingVerification: Promise<void> | undefined;

    if (stage === RESTART_STAGE.VERIFICATION) {
      await act(async () => previous.controller.login('emailCode', 'private-email@example.com'));
      previousGateway.loginResult = () => verification.promise;
      act(() => {
        pendingVerification = previous.controller.verify('654321');
      });
      expect(previous.state.getState().attempt.stage).toBe('verifying');
    }

    initial.unmount();
    await pendingVerification;

    const freshGateway = new TestGateway();
    const nativeResult = deferred<SessionSnapshot>();

    freshGateway.resolveResult = () => nativeResult.promise;

    const fresh = createAuthRuntime(freshGateway, clock);
    const view = render(<App createRuntime={() => fresh} />);

    expect(screen.getByText('Checking your session…')).toBeTruthy();
    expect(screen.queryByText('Home')).toBeNull();
    expect(fresh.state.getState().attempt).toEqual({method: 'password', stage: 'idle'});
    expect(fresh.state.getState().pending).toBe(false);

    const old = previousGateway.requests[previousGateway.requests.length - 1]?.input;
    const current = freshGateway.requests[0]?.input;

    if (!old || !current) throw new Error('missing resolution context');

    await act(async () => {
      verification.resolve(active(old));
      previousGateway.emit(active(old, 99));
    });
    expect(screen.queryByText('Home')).toBeNull();
    await act(async () => nativeResult.resolve(signedOut(current)));
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.queryByText('Home')).toBeNull();
    expect(JSON.stringify(seen)).not.toContain('654321');
    expect(JSON.stringify(seen)).not.toContain('private-email@example.com');
    expect(seen.every((snapshot) => !('token' in snapshot) && !('code' in snapshot))).toBe(true);
    view.unmount();
  },
);
