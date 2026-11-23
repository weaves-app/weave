import {createContext, useContext, useEffect, useState, useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {AppState} from 'react-native';

import {APP_STATE, NATIVE_EVENT} from '../../components/native-options';
import type {AuthController} from '../application/auth-controller';
import type {AuthViewState} from '../domain/auth-models';

const AuthContext = createContext<AuthController | undefined>(undefined);

export interface AuthProviderProps {
  readonly createController: () => AuthController;
  readonly children: ReactNode;
}

export function AuthProvider({createController, children}: AuthProviderProps): React.JSX.Element {
  const [controller] = useState(createController);

  useEffect(() => {
    void controller.start();

    const subscription = AppState.addEventListener(NATIVE_EVENT.APP_STATE_CHANGE, (state) =>
      controller.setForeground(state === APP_STATE.ACTIVE),
    );

    return () => {
      subscription.remove();
      controller.dispose();
    };
  }, [controller]);

  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>;
}

export function useAuthController(): AuthController {
  const controller = useContext(AuthContext);

  if (!controller) throw new Error('Authentication context unavailable');

  return controller;
}

export function useAuthState(): AuthViewState {
  const controller = useAuthController();

  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
