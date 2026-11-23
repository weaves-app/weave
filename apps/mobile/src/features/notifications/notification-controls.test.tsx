import {act, fireEvent, render, screen} from '@testing-library/react-native';

import {NotificationControls} from './presentation/notification-controls';
import {fakeState} from './testing/fakes';
import type {NotificationController} from './application/notification-ports';

function setup() {
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

  return {state, controller};
}

test('S01 hidden for signed-out users; explicit explained Enable has an accessible action', () => {
  const {state, controller} = setup();

  expect(screen.queryByText('Notifications')).toBeNull();
  act(() =>
    state.replace({
      status: 'permission-needed',
      permission: 'undetermined',
      canRequest: true,
      busy: false,
      retryBlocked: false,
    }),
  );
  expect(screen.getByText(/You can keep using Weave without them/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Enable notifications'}));
  expect(controller.enable).toHaveBeenCalledTimes(1);
});

test('S01 busy disables Enable and shows checking instead of ready', () => {
  const {state, controller} = setup();

  act(() =>
    state.replace({
      status: 'permission-needed',
      permission: 'undetermined',
      canRequest: true,
      busy: true,
      retryBlocked: false,
    }),
  );

  const button = screen.getByRole('button', {name: 'Enable notifications'});

  expect(button.props.accessibilityState).toEqual({busy: true, disabled: true});
  fireEvent.press(button);
  expect(controller.enable).not.toHaveBeenCalled();
  expect(screen.queryByText('Notifications are ready on this device.')).toBeNull();
});

test('S02 denial offers explicit settings; pending offers Retry with a bounded disabled state', () => {
  const {state, controller} = setup();

  act(() =>
    state.replace({
      status: 'disabled',
      permission: 'denied',
      canRequest: false,
      busy: false,
      retryBlocked: false,
    }),
  );
  fireEvent.press(screen.getByRole('button', {name: 'Open notification settings'}));
  expect(controller.openSettings).toHaveBeenCalledTimes(1);
  act(() =>
    state.replace({
      status: 'pending',
      permission: 'allowed',
      canRequest: false,
      busy: false,
      retryBlocked: true,
    }),
  );
  expect(
    screen.getByRole('button', {name: 'Retry notification setup'}).props.accessibilityState,
  ).toMatchObject({disabled: true});
  expect(screen.queryByText('Notifications are ready on this device.')).toBeNull();
});
