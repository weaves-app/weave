import {createStore} from 'zustand/vanilla';

import type {AuthStateStore} from '../application/auth-state-store';
import type {AuthViewState} from '../domain/auth-models';

export function createZustandAuthStateStore(initial: AuthViewState): AuthStateStore {
  const store = createStore<AuthViewState>(() => initial);
  const subscriptions = new Set<() => void>();
  let disposed = false;

  return {
    getState: store.getState,
    getInitialState: store.getInitialState,

    replace: (next) => {
      if (!disposed) store.setState(next, true);
    },

    subscribe: (listener) => {
      if (disposed) return () => undefined;

      const remove = store.subscribe(listener);

      const unsubscribe = (): void => {
        remove();
        subscriptions.delete(unsubscribe);
      };

      subscriptions.add(unsubscribe);

      return unsubscribe;
    },

    dispose: () => {
      disposed = true;
      subscriptions.forEach((remove) => remove());
    },
  };
}
