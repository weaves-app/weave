import {useLayoutEffect} from 'react';
import {Text} from 'react-native';
import {act, render, screen, waitFor} from '@testing-library/react-native';

import {AuthProvider, useAuthSelector} from './auth-context';
import type {AuthViewState} from '../domain/auth-models';
import {createInitialAuthState} from '../application/auth-state-store';
import {createZustandAuthStateStore} from '../infrastructure/zustand-auth-state-store';
import {createAuthRuntime} from '../auth-runtime';
import {TestClock, TestGateway} from '../testing/fakes';

export const UNRELATED_UPDATE_COUNT = 100;

export const EVEN_REMAINDER = 0;

function Consumer({
  selector,
  observe,
}: {
  readonly selector: (state: AuthViewState) => string | boolean;
  readonly observe: () => void;
}) {
  const value = useAuthSelector(selector);

  useLayoutEffect(() => {
    observe();
  });

  return <Text>{String(value)}</Text>;
}

test('WEA-27 S06 one hundred unrelated changes never commit unchanged selected consumers', async () => {
  const store = createZustandAuthStateStore(createInitialAuthState());
  const otherStore = createZustandAuthStateStore(createInitialAuthState());
  const runtime = createAuthRuntime(new TestGateway(), new TestClock(), () => store);
  const otherRuntime = createAuthRuntime(new TestGateway(), new TestClock(), () => otherStore);
  let selectedUpdates = 0;
  let pendingUpdates = 0;
  let independentUpdates = 0;
  const first = render(
    <AuthProvider createRuntime={() => runtime}>
      <Consumer selector={(state) => state.session.status} observe={() => selectedUpdates++} />
      <Consumer selector={(state) => state.pending} observe={() => pendingUpdates++} />
    </AuthProvider>,
  );
  const second = render(
    <AuthProvider createRuntime={() => otherRuntime}>
      <Consumer selector={(state) => state.session.status} observe={() => independentUpdates++} />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByText('signedOut')).toBeTruthy());

  const before = selectedUpdates;
  const beforePending = pendingUpdates;
  const beforeIndependent = independentUpdates;

  for (let index = 0; index < UNRELATED_UPDATE_COUNT; index++) {
    act(() => store.replace({...store.getState(), pending: index % 2 === EVEN_REMAINDER}));
  }

  expect(selectedUpdates).toBe(before);
  expect(pendingUpdates - beforePending).toBe(100);
  expect(independentUpdates).toBe(beforeIndependent);
  first.unmount();

  const closedUpdates = selectedUpdates;

  act(() => {
    store.replace({...store.getState(), pending: true});
    otherStore.replace({
      ...otherStore.getState(),
      session: {...otherStore.getState().session, status: 'unavailable'},
    });
  });
  expect(selectedUpdates).toBe(closedUpdates);
  expect(independentUpdates).toBe(beforeIndependent + 1);
  second.unmount();
});
