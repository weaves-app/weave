import type {NotificationReadiness} from './domain/notification-models';
import {createNotificationRuntime} from './notification-runtime';
import {FakeClock, fakePlatform, deferred} from './testing/fakes';

import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {act, render, screen, waitFor} from '@testing-library/react-native';
import {AppState} from 'react-native';

import {App} from '../../../App';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {active, TestClock, TestGateway} from '../../auth/testing/fakes';

it('S03/S08 the production root exposes safe notification recovery when the native module is unavailable', async () => {
  const previous = AppState.currentState;

  AppState.currentState = 'active';

  try {
    const gateway = new TestGateway();

    gateway.resolveResult = async (input) => active(input);

    const auth = createAuthRuntime(gateway, new TestClock());

    render(<App createRuntime={() => auth} />);
    await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Notifications')).toBeTruthy());
    expect(screen.getByRole('button', {name: 'Retry notification setup'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Logout'})).toBeTruthy();
    expect(gateway.requests).toHaveLength(1);
  } finally {
    AppState.currentState = previous;
  }
});

it('S03/S11 Home becomes ready only after the current server proof and leaves auth untouched', async () => {
  const previous = AppState.currentState;

  AppState.currentState = 'active';

  try {
    const gateway = new TestGateway();

    gateway.resolveResult = async (input) => active(input);

    const auth = createAuthRuntime(gateway, new TestClock());
    const platform = fakePlatform();
    const proof = deferred<NotificationReadiness>();

    jest.mocked(platform.reconcile).mockImplementation(async (_context, rootLease, generation) => ({
      rootLease,
      generation,
      revision: 7,
      permission: 'allowed',
      canRequest: false,
      registrationPresent: true,
      enabled: true,
      matchesCurrentAccount: true,
    }));
    jest.mocked(platform.checkReadiness).mockReturnValue(proof.promise);
    render(
      <App
        createRuntime={() => auth}
        createNotifications={(reader) =>
          createNotificationRuntime(reader, platform, new FakeClock(), 'root-a')
        }
      />,
    );
    await waitFor(() => expect(platform.checkReadiness).toHaveBeenCalledTimes(1));

    const before = auth.state.getState();

    expect(screen.queryByText('Notifications are ready on this device.')).toBeNull();
    expect(platform.enable).not.toHaveBeenCalled();

    const attempt = jest.mocked(platform.checkReadiness).mock.calls[0];

    if (!attempt) throw new Error('Missing current attempt');

    await act(async () =>
      proof.resolve({
        ...attempt[0],
        revision: attempt[1],
        attemptId: attempt[2],
        status: 'ready',
        remainingValidityMs: 60000,
      }),
    );
    expect(screen.getByText('Notifications are ready on this device.')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Logout'})).toBeTruthy();
    expect(auth.state.getState()).toBe(before);
    expect(gateway.requests).toHaveLength(1);
  } finally {
    AppState.currentState = previous;
  }
});
