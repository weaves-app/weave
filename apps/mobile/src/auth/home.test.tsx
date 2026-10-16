import {LocalizationProvider} from '../localization/presentation/localization-context';
import {createSentinelLocalization} from '../localization/testing/sentinel-localization';

import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AuthProvider} from './presentation/auth-context';
import {HomeScreen} from './presentation/home-screen';
import {createAuthRuntime} from './auth-runtime';
import {active, TestClock, TestGateway} from './testing/fakes';

export const SIGN_OUT_COMMAND = 'signOut';

test('S09/S11 Home has one Logout action with accessible pending feedback and one request', async () => {
  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = () => new Promise(() => undefined);

  const runtime = createAuthRuntime(gateway, new TestClock());
  const controller = runtime.controller;
  const {unmount} = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: {x: 0, y: 0, width: 390, height: 844},
        insets: {top: 0, left: 0, right: 0, bottom: 0},
      }}
    >
      <AuthProvider createRuntime={() => runtime}>
        <HomeScreen />
      </AuthProvider>
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(controller.getSnapshot().session.status).toBe('active'));
  expect(screen.getAllByRole('button')).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  expect(gateway.requests.filter((request) => request.method === SIGN_OUT_COMMAND)).toHaveLength(1);
  expect(screen.getByRole('button', {name: 'Logout'})).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent(/Signing out/);
  unmount();
});

test('WEA-28 S01/S03 Home and sign-out announcements consume scoped English', async () => {
  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = () => new Promise(() => undefined);

  const runtime = createAuthRuntime(gateway, new TestClock());

  render(
    <LocalizationProvider createRuntime={createSentinelLocalization}>
      <AuthProvider createRuntime={() => runtime}>
        <HomeScreen />
      </AuthProvider>
    </LocalizationProvider>,
  );
  await waitFor(() => expect(screen.getByText('English fixture: Home')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', {name: 'English fixture: Logout'}));
  expect(screen.getByRole('alert')).toHaveTextContent('English fixture: Signing out…');
});
