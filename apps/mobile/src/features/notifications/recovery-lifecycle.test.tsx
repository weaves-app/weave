import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {AppState} from 'react-native';

import {App} from '../../../App';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {active, TestClock, TestGateway} from '../../auth/testing/fakes';
import {createNotificationRuntime} from './notification-runtime';
import {FakeClock, fakePlatform, deferred} from './testing/fakes';
import type {NotificationReadiness} from './domain/notification-models';

const originalAppState = AppState.currentState;

afterEach(() => {
  AppState.currentState = originalAppState;
});

it('S04/S08 delayed verification cannot delay Logout or disturb the next login form', async () => {
  AppState.currentState = 'active';

  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);

  const auth = createAuthRuntime(gateway, new TestClock());
  const platform = fakePlatform();
  const proof = deferred<NotificationReadiness>();

  jest.mocked(platform.reconcile).mockImplementation(async (context, rootLease, generation) => ({
    rootLease,
    generation,
    revision: 1,
    permission: 'allowed',
    canRequest: false,
    enabled: true,
    registrationPresent: true,
    matchesCurrentAccount: !!context,
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
  expect(screen.queryByText('Notifications are ready on this device.')).toBeNull();
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Email'), 'draft@example.test');

  const attempt = jest.mocked(platform.checkReadiness).mock.calls[0];

  if (!attempt) throw new Error('Missing captured attempt');

  await act(async () =>
    proof.resolve({
      ...attempt[0],
      revision: attempt[1],
      attemptId: attempt[2],
      status: 'ready',
      remainingValidityMs: 60000,
    }),
  );
  expect(screen.queryByText('Home')).toBeNull();
  expect(screen.queryByText('Notifications')).toBeNull();
  expect(screen.getByLabelText('Email')).toHaveDisplayValue('draft@example.test');
  expect(gateway.requests.map((request) => request.method)).toEqual(['resolve', 'signOut']);
});

it.each(['unauthorized', 'rate-limited', 'unavailable'] as const)(
  'S08 %s verification preserves Home and Retry never sends an auth command',
  async (status) => {
    AppState.currentState = 'active';

    const gateway = new TestGateway();

    gateway.resolveResult = async (input) => active(input);

    const auth = createAuthRuntime(gateway, new TestClock());
    const platform = fakePlatform();
    const clock = new FakeClock();

    jest.mocked(platform.reconcile).mockImplementation(async (_context, rootLease, generation) => ({
      rootLease,
      generation,
      revision: 1,
      permission: 'allowed',
      canRequest: false,
      enabled: true,
      registrationPresent: true,
      matchesCurrentAccount: true,
    }));
    jest
      .mocked(platform.checkReadiness)
      .mockImplementation(async (context, revision, attemptId) => ({
        ...context,
        revision,
        attemptId,
        status,
        remainingValidityMs: 0,
        retryAfterSeconds: 1,
      }));
    render(
      <App
        createRuntime={() => auth}
        createNotifications={(reader) =>
          createNotificationRuntime(reader, platform, clock, 'root-a')
        }
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', {name: 'Retry notification setup'}).props.accessibilityState,
      ).toMatchObject({busy: false}),
    );
    expect(screen.getByText('Home')).toBeTruthy();

    const before = gateway.requests.length;

    act(() => clock.advance(1000));
    fireEvent.press(screen.getByRole('button', {name: 'Retry notification setup'}));
    fireEvent.press(screen.getByRole('button', {name: 'Retry notification setup'}));
    await waitFor(() => expect(platform.checkReadiness).toHaveBeenCalledTimes(2));
    expect(gateway.requests).toHaveLength(before);
    expect(screen.queryByText('Notifications are ready on this device.')).toBeNull();
  },
);
