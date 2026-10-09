import {act, render, screen, waitFor} from '@testing-library/react-native';
import {createNavigationContainerRef} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from '../auth/presentation/auth-context';
import {createAuthController} from '../auth/application/auth-controller';
import {active, deferred, TestClock, TestGateway} from '../auth/testing/fakes';
import type {SessionSnapshot} from '../auth/domain/auth-models';
import {RootNavigator} from './root-navigator';
import type {RootParams} from './root-navigator';
const metrics = {
  frame: {x: 0, y: 0, width: 390, height: 844},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};
function setup(gateway = new TestGateway()) {
  const controller = createAuthController(gateway, new TestClock());
  const navigationRef = createNavigationContainerRef<RootParams>();
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthProvider createController={() => controller}>
        <RootNavigator navigationRef={navigationRef} />
      </AuthProvider>
    </SafeAreaProvider>,
  );
  return {gateway, controller, navigationRef};
}
test('S01/S06 signed-out stack has only Login and rejects direct Home navigation', async () => {
  const {navigationRef} = setup();
  await waitFor(() => expect(navigationRef.isReady()).toBe(true));
  expect(navigationRef.getRootState()?.routeNames).toEqual(['Login']);
  const warning = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    act(() => navigationRef.navigate('Home'));
    expect(navigationRef.getCurrentRoute()?.name).toBe('Login');
  } finally {
    warning.mockRestore();
  }
  expect(screen.queryByText('Home')).toBeNull();
});
test('S05 no Login or Home flash during unresolved validation', () => {
  const gateway = new TestGateway();
  gateway.resolveResult = () => new Promise(() => undefined);
  setup(gateway);
  expect(screen.getByText('Checking your session…')).toBeTruthy();
  expect(screen.queryByText('Welcome back')).toBeNull();
  expect(screen.queryByText('Home')).toBeNull();
});
test('S02/S07 session changes replace route history and revocation removes Home', async () => {
  const {controller, gateway, navigationRef} = setup();
  await waitFor(() => expect(navigationRef.isReady()).toBe(true));
  await act(async () => controller.login('google'));
  await waitFor(() => expect(navigationRef.getRootState()?.routeNames).toEqual(['Home']));
  expect(navigationRef.canGoBack()).toBe(false);
  act(() =>
    gateway.emit({
      status: 'signedOut',
      generation: controller.getSnapshot().session.generation,
      revision: 2,
    }),
  );
  await waitFor(() => expect(navigationRef.getRootState()?.routeNames).toEqual(['Login']));
  expect(navigationRef.canGoBack()).toBe(false);
  expect(screen.queryByText('Home')).toBeNull();
});
test('S04 unavailable validation exposes retry outside routes', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => ({
    status: 'unavailable',
    generation: input.generation,
    revision: 1,
    error: {code: 'network', messageKey: 'network'},
  });
  const {navigationRef} = setup(gateway);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Try again'})).toBeTruthy());
  expect(navigationRef.isReady()).toBe(false);
  expect(screen.queryByText('Home')).toBeNull();
});
test('S05 restored active session starts directly at Home after resolution', async () => {
  const gateway = new TestGateway();
  const result = deferred<SessionSnapshot>();
  gateway.resolveResult = () => result.promise;
  const {navigationRef} = setup(gateway);
  const input = gateway.requests[0]?.input;
  if (!input) throw new Error('missing request');
  await act(async () => result.resolve(active(input)));
  await waitFor(() => expect(navigationRef.getCurrentRoute()?.name).toBe('Home'));
  expect(navigationRef.canGoBack()).toBe(false);
});
test('S09 logout removes Home history and fresh reopen remains signed out', async () => {
  const gateway = new TestGateway();
  gateway.resolveResult = async (input) => active(input);
  const {controller, navigationRef} = setup(gateway);
  await waitFor(() => expect(navigationRef.isReady()).toBe(true));
  await act(async () => controller.logout());
  await waitFor(() => expect(navigationRef.getRootState()?.routeNames).toEqual(['Login']));
  expect(navigationRef.canGoBack()).toBe(false);
  expect(screen.queryByText('Home')).toBeNull();
  gateway.resolveResult = async (input) => ({
    status: 'signedOut',
    generation: input.generation,
    revision: 1,
  });
  await act(async () => controller.refresh());
  expect(navigationRef.getCurrentRoute()?.name).toBe('Login');
});
