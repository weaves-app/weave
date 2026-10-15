import {StrictMode, Suspense} from 'react';
import {Text, AppState} from 'react-native';
import {render, screen, waitFor} from '@testing-library/react-native';

import {AuthProvider, useAuthState} from './auth-context';
import {createAuthRuntime} from '../auth-runtime';
import {TestClock, TestGateway} from '../testing/fakes';

function Status() {
  return <Text>{useAuthState().session.status}</Text>;
}

test('WEA-27 S05 effect replay replaces a disposed runtime and preserves fresh resolution', async () => {
  const gateways: TestGateway[] = [];
  const removers: jest.Mock[] = [];
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => {
    const remove = jest.fn();

    removers.push(remove);

    return {remove};
  });

  const factory = () => {
    const gateway = new TestGateway();

    gateways.push(gateway);

    return createAuthRuntime(gateway, new TestClock());
  };

  const view = render(
    <StrictMode>
      <AuthProvider createRuntime={factory}>
        <Status />
      </AuthProvider>
    </StrictMode>,
  );

  await waitFor(() => expect(screen.getByText('signedOut')).toBeTruthy());
  expect(gateways).toHaveLength(2);
  expect(gateways[0]?.disposed).toBe(true);
  expect(gateways[1]?.disposed).toBe(false);
  expect(gateways[1]?.requests).toHaveLength(1);
  expect(removers[0]).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(gateways[1]?.disposed).toBe(true);
  expect(removers[1]).toHaveBeenCalledTimes(1);
  subscription.mockRestore();
});

test('WEA-27 S05 suspended abandoned render allocates no runtime or native work', () => {
  const factory = jest.fn(() => createAuthRuntime(new TestGateway(), new TestClock()));
  const pending = new Promise<void>(() => undefined);

  function Suspended(): never {
    throw pending;
  }

  const view = render(
    <Suspense fallback={<Text>Waiting</Text>}>
      <AuthProvider createRuntime={factory}>
        <Status />
      </AuthProvider>
      <Suspended />
    </Suspense>,
  );

  expect(screen.getByText('Waiting')).toBeTruthy();
  expect(factory).not.toHaveBeenCalled();
  view.unmount();
});
