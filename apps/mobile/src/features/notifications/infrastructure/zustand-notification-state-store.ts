import {createStore} from 'zustand/vanilla';

import type {NotificationStateWriter} from '../application/notification-ports';
import {INITIAL_NOTIFICATION_STATE} from '../domain/notification-models';

export function createNotificationStateStore(): NotificationStateWriter {
  const store = createStore(() => INITIAL_NOTIFICATION_STATE);
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
      subscriptions.clear();
    },
  };
}
