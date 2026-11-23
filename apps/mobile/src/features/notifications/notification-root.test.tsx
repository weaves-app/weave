import {AppErrorBoundary} from '../../recovery/app-error-boundary';

import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {AppState} from 'react-native';

import {AuthProvider} from '../../auth/presentation/auth-context';
import {HomeScreen} from '../../auth/presentation/home-screen';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {active, TestClock, TestGateway} from '../../auth/testing/fakes';
import type {NotificationFactory} from './presentation/notification-context';
import {NotificationRoot} from './presentation/notification-context';
import {createNotificationRuntime} from './notification-runtime';
import {FakeClock, fakePlatform} from './testing/fakes';

const initialAppState = AppState.currentState;

afterEach(() => {
  AppState.currentState = initialAppState;
});

test('S01 Home composes notification controls without replacing Logout or invoking auth commands', async () => {
  AppState.currentState = 'active';

  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);

  const auth = createAuthRuntime(gateway, new TestClock());
  const platform = fakePlatform();
  const {unmount} = render(
    <AuthProvider createRuntime={() => auth}>
      <NotificationRoot
        createRuntime={(reader) =>
          createNotificationRuntime(reader, platform, new FakeClock(), 'root-a')
        }
      >
        <HomeScreen />
      </NotificationRoot>
    </AuthProvider>,
  );

  await waitFor(() =>
    expect(screen.getByRole('button', {name: 'Enable notifications'})).toBeTruthy(),
  );
  expect(screen.getByRole('button', {name: 'Logout'})).toBeTruthy();

  const previous = gateway.requests.length;

  fireEvent.press(screen.getByRole('button', {name: 'Enable notifications'}));
  await waitFor(() => expect(platform.enable).toHaveBeenCalledTimes(1));
  expect(gateway.requests).toHaveLength(previous);
  unmount();
  expect(platform.release).toHaveBeenCalledTimes(1);
});

test('S09 removing a notification factory clears its panel and releases its root', async () => {
  AppState.currentState = 'active';

  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);

  const auth = createAuthRuntime(gateway, new TestClock());
  const platform = fakePlatform();

  const authFactory = () => auth;

  const factory: NotificationFactory = (reader) =>
    createNotificationRuntime(reader, platform, new FakeClock(), 'root-a');

  const {rerender} = render(
    <AuthProvider createRuntime={authFactory}>
      <NotificationRoot createRuntime={factory}>
        <HomeScreen />
      </NotificationRoot>
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByText('Notifications')).toBeTruthy());
  rerender(
    <AuthProvider createRuntime={authFactory}>
      <NotificationRoot>
        <HomeScreen />
      </NotificationRoot>
    </AuthProvider>,
  );
  expect(screen.queryByText('Notifications')).toBeNull();
  expect(platform.release).toHaveBeenCalledTimes(1);
});

test('S09 a native listener setup failure releases the already-created notification runtime', async () => {
  AppState.currentState = 'active';

  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);

  const auth = createAuthRuntime(gateway, new TestClock());
  const platform = fakePlatform();
  let calls = 0;
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const add = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
    calls += 1;

    if (calls === NOTIFICATION_LISTENER_REGISTRATION) throw new Error('listener setup failed');

    return {remove: jest.fn()};
  });

  try {
    render(
      <AppErrorBoundary
        renderChildren={() => (
          <AuthProvider createRuntime={() => auth}>
            <NotificationRoot
              createRuntime={(reader) =>
                createNotificationRuntime(reader, platform, new FakeClock(), 'root-a')
              }
            >
              <HomeScreen />
            </NotificationRoot>
          </AuthProvider>
        )}
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', {name: 'Reload'})).toBeTruthy());
    expect(platform.acquire).toHaveBeenCalledTimes(1);
    expect(platform.release).toHaveBeenCalledTimes(1);
  } finally {
    add.mockRestore();
    errorLog.mockRestore();
  }
});

export const NOTIFICATION_LISTENER_REGISTRATION = 2;
