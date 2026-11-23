import {act, render, screen, waitFor} from '@testing-library/react-native';
import {AppState, ScrollView, Text} from 'react-native';

import {AuthProvider} from '../../auth/presentation/auth-context';
import {HomeScreen} from '../../auth/presentation/home-screen';
import {createAuthRuntime} from '../../auth/auth-runtime';
import {active, TestClock, TestGateway} from '../../auth/testing/fakes';
import {NotificationRoot} from './presentation/notification-context';
import {createNotificationRuntime} from './notification-runtime';
import {FakeClock, fakePlatform, fakeState} from './testing/fakes';
import {NotificationControls} from './presentation/notification-controls';
import type {NotificationController} from './application/notification-ports';

const initialAppState = AppState.currentState;

afterEach(() => {
  AppState.currentState = initialAppState;
});

it('S10 Home keeps Logout and notification actions inside an unconstrained scroll container', async () => {
  AppState.currentState = 'active';

  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);

  const auth = createAuthRuntime(gateway, new TestClock());
  const platform = fakePlatform();
  const view = render(
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

  const scroll = view.UNSAFE_getByType(ScrollView);

  expect(scroll.findAllByType(Text).map((node): unknown => node.props.children)).toEqual(
    expect.arrayContaining(['Logout', 'Enable notifications']),
  );
  expect(scroll.props.contentContainerStyle).toMatchObject({flexGrow: 1});

  for (const label of view.UNSAFE_getAllByType(Text)) {
    expect(label.props.allowFontScaling).not.toBe(false);
    expect(label.props.numberOfLines).toBeUndefined();
  }
});

it('S10 announces one meaningful state without a countdown and exposes explicit enabled/busy actions', () => {
  const state = fakeState();
  const controller: NotificationController = {
    start: jest.fn(),
    refresh: jest.fn(async () => undefined),
    enable: jest.fn(async () => undefined),
    openSettings: jest.fn(async () => undefined),
    setForeground: jest.fn(),
    dispose: jest.fn(),
  };

  render(<NotificationControls state={state} controller={controller} />);
  act(() =>
    state.replace({
      status: 'pending',
      permission: 'allowed',
      canRequest: false,
      busy: false,
      retryBlocked: true,
    }),
  );
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('polite');
  expect(
    screen.getByRole('button', {name: 'Retry notification setup'}).props.accessibilityState,
  ).toEqual({busy: false, disabled: true});
  expect(screen.queryByText(/\d+ seconds/)).toBeNull();
  act(() =>
    state.replace({
      status: 'ready',
      permission: 'allowed',
      canRequest: false,
      busy: false,
      retryBlocked: false,
    }),
  );
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByText('Notifications are ready on this device.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
