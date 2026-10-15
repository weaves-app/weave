import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';
import {useStore} from 'zustand';

import {APP_STATE, NATIVE_EVENT} from '../../components/native-options';
import {Feedback} from '../../components/feedback';
import {Screen} from '../../components/screen';
import type {AuthRuntime} from '../auth-runtime';
import type {AuthController} from '../application/auth-controller';
import type {AuthViewState} from '../domain/auth-models';

const AuthContext = createContext<AuthRuntime | undefined>(undefined);

export interface AuthProviderProps {
  readonly createRuntime: () => AuthRuntime;
  readonly children: ReactNode;
}

interface Activation {
  readonly runtime: AuthRuntime;
  active: boolean;
}

export function AuthProvider({createRuntime, children}: AuthProviderProps): React.JSX.Element {
  const [activation, setActivation] = useState<Activation>();

  useEffect(() => {
    const runtime = createRuntime();
    const next: Activation = {runtime, active: true};
    let removeAppState: (() => void) | undefined;
    let removeReady: (() => void) | undefined;

    const cleanup = (): void => {
      next.active = false;

      try {
        removeReady?.();
        removeAppState?.();
      } finally {
        runtime.dispose();
      }
    };

    try {
      const subscription = AppState.addEventListener(NATIVE_EVENT.APP_STATE_CHANGE, (state) =>
        runtime.controller.setForeground(state === APP_STATE.ACTIVE),
      );

      removeAppState = () => subscription.remove();
      // Bind from the controller's first state publication; render owns no native work.
      removeReady = runtime.state.subscribe(() => {
        if (!next.active) return;

        setActivation(next);
        removeReady?.();
      });
      void runtime.controller.start();
    } catch (error: unknown) {
      cleanup();

      throw error;
    }

    return cleanup;
  }, [createRuntime]);

  if (!activation?.active)
    return (
      <Screen>
        <Feedback message="Checking your session…" busy />
      </Screen>
    );

  return <AuthContext.Provider value={activation.runtime}>{children}</AuthContext.Provider>;
}

function useAuthRuntime(): AuthRuntime {
  const runtime = useContext(AuthContext);

  if (!runtime) throw new Error('Authentication context unavailable');

  return runtime;
}

export function useAuthController(): AuthController {
  return useAuthRuntime().controller;
}

export function useAuthState(): AuthViewState {
  return useAuthSelector((state) => state);
}

export function useAuthSelector<T>(selector: (state: AuthViewState) => T): T {
  return useStore(useAuthRuntime().state, selector);
}
