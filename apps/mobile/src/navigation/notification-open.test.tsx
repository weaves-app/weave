import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

import {act, render, screen, waitFor} from '@testing-library/react-native';

import {App} from '../../App';
import {createAuthRuntime} from '../auth/auth-runtime';
import {active, TestClock, TestGateway} from '../auth/testing/fakes';
import {createNotificationRuntime} from '../features/notifications/notification-runtime';
import {createNativeNotificationGateway} from '../features/notifications/infrastructure/native-notification-gateway';
import {FakeClock} from '../features/notifications/testing/fakes';

export const OPEN_SESSION = {ACTIVE: 'active', CHECKING: 'checking'} as const;

it.each(['active', 'expired', 'checking', 'signedOut'] as const)(
  'S06/S07 notification payloads cannot alter the normal %s session gate',
  async (status) => {
    const gateway = new TestGateway();

    gateway.resolveResult = (input) =>
      status === OPEN_SESSION.CHECKING
        ? new Promise(() => undefined)
        : Promise.resolve(
            status === OPEN_SESSION.ACTIVE
              ? active(input)
              : {status: 'signedOut', generation: input.generation, revision: 1},
          );

    const auth = createAuthRuntime(gateway, new TestClock());

    let emit: (value: string) => void = () => undefined;

    const notifications = createNativeNotificationGateway({
      execute: async (_command, raw) => {
        const request = JSON.parse(raw) as {
          readonly rootLease: string;
          readonly generation: number;
        };

        return JSON.stringify({
          version: 1,
          kind: 'observation',
          rootLease: request.rootLease,
          generation: request.generation,
          revision: 1,
          permission: 'undetermined',
          canRequest: true,
          enabled: false,
          registrationPresent: false,
          matchesCurrentAccount: false,
        });
      },

      subscribe: (listener) => {
        emit = listener;

        return () => undefined;
      },
    });

    render(
      <App
        createRuntime={() => auth}
        createNotifications={(reader) =>
          createNotificationRuntime(reader, notifications, new FakeClock(), 'root-open')
        }
      />,
    );
    await waitFor(() => expect(gateway.requests).toHaveLength(1));

    if (status === OPEN_SESSION.ACTIVE)
      await waitFor(() => expect(screen.getByText('Home')).toBeTruthy());

    const snapshot = auth.state.getState();

    for (const payload of [
      {kind: 'click', url: 'https://evil.example', accountId: 'other-account'},
      {kind: 'click', url: 'weave://Home', action: 'logout'},
      {version: 1, kind: 'observation', rootLease: 'old', generation: 0, privateBody: 'secret'},
      null,
    ]) {
      act(() => {
        emit(JSON.stringify(payload));
        emit(JSON.stringify(payload));
      });
    }

    expect(auth.state.getState()).toBe(snapshot);
    expect(gateway.requests).toHaveLength(1);

    if (status === OPEN_SESSION.ACTIVE) expect(screen.getByText('Home')).toBeTruthy();
    else expect(screen.queryByText('Home')).toBeNull();

    if (status === OPEN_SESSION.CHECKING)
      expect(screen.getByText('Checking your session…')).toBeTruthy();
  },
);
