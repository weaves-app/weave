import {createContext, useContext, useEffect, useState, useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';

import {APP_STATE, NATIVE_EVENT} from '../../../components/native-options';
import {useAuthStateReader} from '../../../auth/presentation/auth-context';
import type {AuthStateReader} from '../../../auth/application/auth-state-store';
import type {NotificationRuntime} from '../notification-runtime';
import {NotificationControls} from './notification-controls';

export interface NotificationFactory {
  (auth: AuthStateReader): NotificationRuntime;
}

const NotificationContext = createContext<NotificationRuntime | undefined>(undefined);

export function NotificationRoot({
  children,
  createRuntime,
}: {
  readonly children: ReactNode;
  readonly createRuntime?: NotificationFactory;
}): React.JSX.Element {
  const auth = useAuthStateReader();
  const [activationStore] = useState(createActivationStore);
  const activation = useSyncExternalStore(
    activationStore.subscribe,
    activationStore.getSnapshot,
    activationStore.getSnapshot,
  );

  useEffect(() => {
    if (!createRuntime) return;

    const owned = createRuntime(auth);
    const next = {runtime: owned, factory: createRuntime, active: true};
    let removeListener: (() => void) | undefined;

    const cleanup = (): void => {
      next.active = false;
      activationStore.replace(undefined);

      try {
        removeListener?.();
      } finally {
        owned.dispose();
      }
    };

    try {
      owned.controller.setForeground(AppState.currentState === APP_STATE.ACTIVE);

      const subscription = AppState.addEventListener(NATIVE_EVENT.APP_STATE_CHANGE, (state) =>
        owned.controller.setForeground(state === APP_STATE.ACTIVE),
      );

      removeListener = () => subscription.remove();
      activationStore.replace(next);
    } catch (error: unknown) {
      cleanup();

      throw error;
    }

    return cleanup;
  }, [auth, createRuntime, activationStore]);

  const runtime =
    activation?.active && activation.factory === createRuntime ? activation.runtime : undefined;

  return <NotificationContext.Provider value={runtime}>{children}</NotificationContext.Provider>;
}

export function NotificationPanel(): React.JSX.Element | null {
  const runtime = useContext(NotificationContext);

  return runtime ? (
    <NotificationControls state={runtime.state} controller={runtime.controller} />
  ) : null;
}

interface NotificationActivation {
  readonly runtime: NotificationRuntime;
  readonly factory: NotificationFactory;
  active: boolean;
}

// React observes effect-owned native resources through an external store.
// Creating this container is pure; native acquisition remains in the effect.
function createActivationStore(): {
  getSnapshot(): NotificationActivation | undefined;
  subscribe(listener: () => void): () => void;
  replace(value: NotificationActivation | undefined): void;
} {
  let value: NotificationActivation | undefined;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => value,

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    replace: (next) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}
