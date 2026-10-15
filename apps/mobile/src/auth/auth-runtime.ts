import {createAuthController} from './application/auth-controller';
import type {AuthController} from './application/auth-controller';
import {createInitialAuthState} from './application/auth-state-store';
import type {AuthStateReader, AuthStateStore} from './application/auth-state-store';
import type {AuthenticationGateway} from './application/authentication-gateway';
import type {Clock} from './application/clock';
import {createZustandAuthStateStore} from './infrastructure/zustand-auth-state-store';

export interface AuthRuntime {
  readonly controller: AuthController;
  readonly state: AuthStateReader;
  dispose(): void;
}

export interface AuthStateStoreFactory {
  (): AuthStateStore;
}

export function createAuthRuntime(
  gateway: AuthenticationGateway,
  clock: Clock,
  createState: AuthStateStoreFactory = () => createZustandAuthStateStore(createInitialAuthState()),
): AuthRuntime {
  let state: AuthStateStore | undefined;

  try {
    state = createState();

    const ownedState = state;
    const controller = createAuthController(gateway, clock, ownedState);
    let disposed = false;

    return {
      controller,
      state: {
        getState: ownedState.getState,
        getInitialState: ownedState.getInitialState,
        subscribe: ownedState.subscribe,
      },

      dispose: () => {
        if (disposed) return;

        disposed = true;

        try {
          controller.dispose();
        } finally {
          ownedState.dispose();
        }
      },
    };
  } catch (error: unknown) {
    try {
      gateway.dispose();
    } finally {
      state?.dispose();
    }

    throw error;
  }
}
