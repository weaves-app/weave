import type {AuthViewState} from '../domain/auth-models';

import {SESSION_STATUS, AUTH_METHOD, LOGIN_STAGE} from '../domain/auth-models';

export interface AuthStateReader {
  getState(): AuthViewState;
  getInitialState(): AuthViewState;
  subscribe(listener: (state: AuthViewState, previous: AuthViewState) => void): () => void;
}

export interface AuthStateStore extends AuthStateReader {
  replace(next: AuthViewState): void;
  dispose(): void;
}

export function createInitialAuthState(): AuthViewState {
  return {
    session: {status: SESSION_STATUS.RESOLVING, generation: 0, revision: 0},
    attempt: {method: AUTH_METHOD.PASSWORD, stage: LOGIN_STAGE.IDLE},
    pending: false,
  };
}
