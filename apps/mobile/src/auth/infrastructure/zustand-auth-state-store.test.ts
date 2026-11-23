import {createZustandAuthStateStore} from './zustand-auth-state-store';
import type {AuthViewState} from '../domain/auth-models';

function initial(): AuthViewState {
  return {
    session: {status: 'resolving', generation: 0, revision: 0},
    attempt: {method: 'password', stage: 'idle'},
    pending: false,
  };
}

test('WEA-27 S01/S06 replacement synchronously updates both readers and removes old error', () => {
  const store = createZustandAuthStateStore(initial());
  const seen: AuthViewState[] = [];
  const other: AuthViewState[] = [];

  store.subscribe(() => seen.push(store.getState()));
  store.subscribe(() => other.push(store.getState()));
  store.replace({...initial(), error: {code: 'network', messageKey: 'network'}});
  expect(store.getState().error?.code).toBe('network');
  store.replace({...initial(), pending: true});
  expect(store.getState()).toMatchObject({pending: true});
  expect(store.getState()).not.toHaveProperty('error');
  expect(seen).toHaveLength(2);
  expect(other).toEqual(seen);
  expect(seen[1]).toBe(store.getState());
});

test('WEA-27 S06 unsubscribe and disposal isolate lifetimes and reject later writes', () => {
  const store = createZustandAuthStateStore(initial());
  const independent = createZustandAuthStateStore(initial());
  let updates = 0;

  const unsubscribe = store.subscribe(() => updates++);

  store.replace({...initial(), pending: true});
  expect(updates).toBe(1);
  expect(independent.getState().pending).toBe(false);
  unsubscribe();
  unsubscribe();
  store.replace(initial());
  expect(updates).toBe(1);

  const before = store.getState();

  store.subscribe(() => updates++);
  store.dispose();
  store.dispose();
  store.subscribe(() => updates++);
  store.replace({...initial(), pending: true});
  expect(store.getState()).toBe(before);
  expect(updates).toBe(1);
});

test('WEA-27 S06 identical replacement preserves snapshot identity without notification', () => {
  const seed = initial();
  const store = createZustandAuthStateStore(seed);
  let updates = 0;

  store.subscribe(() => updates++);
  store.replace({...seed, pending: true});

  const snapshot = store.getState();

  store.replace(snapshot);
  expect(updates).toBe(1);
  expect(store.getState()).toBe(snapshot);
  expect(store.getInitialState()).toBe(seed);
});
