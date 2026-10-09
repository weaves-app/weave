import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AuthProvider} from './presentation/auth-context';
import {HomeScreen} from './presentation/home-screen';
import {createAuthController} from './application/auth-controller';
import {active, TestClock, TestGateway} from './testing/fakes';

test('S09/S11 Home has one Logout action with accessible pending feedback and one request', async () => {
  const gateway = new TestGateway();

  gateway.resolveResult = async (input) => active(input);
  gateway.signOutResult = () => new Promise(() => undefined);

  const controller = createAuthController(gateway, new TestClock());
  const {unmount} = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: {x: 0, y: 0, width: 390, height: 844},
        insets: {top: 0, left: 0, right: 0, bottom: 0},
      }}
    >
      <AuthProvider createController={() => controller}>
        <HomeScreen />
      </AuthProvider>
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(controller.getSnapshot().session.status).toBe('active'));
  expect(screen.getAllByRole('button')).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  fireEvent.press(screen.getByRole('button', {name: 'Logout'}));
  expect(gateway.requests.filter((request) => request.method === 'signOut')).toHaveLength(1);
  expect(screen.getByRole('button', {name: 'Logout'})).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent(/Signing out/);
  unmount();
});
