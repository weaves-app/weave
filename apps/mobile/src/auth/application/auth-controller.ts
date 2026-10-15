import type {AuthStateStore} from './auth-state-store';
import type {OperationContext, AuthenticationGateway} from './authentication-gateway';
import type {Clock} from './clock';
import type {
  AuthMethod,
  AuthViewState,
  SessionSnapshot,
  AuthResult,
  SafeAuthError,
} from '../domain/auth-models';

import {
  AUTH_ERROR_CODE,
  SESSION_STATUS,
  LOGIN_STAGE,
  AUTH_METHOD,
  AUTH_RESULT_KIND,
} from '../domain/auth-models';

export const AUTH_TIMEOUT_MS = {
  STANDARD: 30_000,
  GOOGLE: 120_000,
} as const;

export interface AuthController {
  getSnapshot(): AuthViewState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  refresh(): Promise<void>;
  login(method: AuthMethod, email?: string, password?: string): Promise<void>;
  verify(code: string): Promise<void>;
  resend(): Promise<void>;
  selectMethod(method: AuthMethod): void;
  logout(): Promise<void>;
  setForeground(foreground: boolean): void;
  dispose(): void;
}

export function createAuthController(
  gateway: AuthenticationGateway,
  clock: Clock,
  store: AuthStateStore,
): AuthController {
  let disposed = false;
  let foreground = true;
  let started = false;
  let unsubscribe: (() => void) | undefined;
  let cancelOperation: (() => void) | undefined;
  let context: OperationContext | undefined;
  let pauseDeadline: (() => void) | undefined;
  let resumeDeadline: (() => void) | undefined;

  function publish(next: AuthViewState): void {
    if (disposed) return;

    store.replace(next);
  }

  function accept(snapshot: SessionSnapshot, fromCommand = false): void {
    if (
      fromCommand &&
      snapshot.status === SESSION_STATUS.UNAVAILABLE &&
      context?.generation === snapshot.generation
    ) {
      publish({
        ...store.getState(),
        session: {
          ...snapshot,
          revision: Math.max(snapshot.revision, store.getState().session.revision),
        },
        error: snapshot.error,
      });

      return;
    }

    if (
      !context ||
      snapshot.generation !== context.generation ||
      snapshot.revision < store.getState().session.revision ||
      (snapshot.revision === store.getState().session.revision &&
        store.getState().session.status !== SESSION_STATUS.RESOLVING &&
        !fromCommand)
    )
      return;

    publish({...store.getState(), session: snapshot, error: snapshot.error});
  }

  function abandon(): void {
    cancelOperation?.();
    cancelOperation = undefined;

    if (context) void gateway.abandon(context).catch(() => undefined);
  }

  async function refresh(): Promise<void> {
    if (disposed) return;

    if (!started) {
      await start();

      return;
    }

    const preserveChallenge =
      !store.getState().pending && store.getState().attempt.stage === LOGIN_STAGE.AWAITING_CODE;

    if (!preserveChallenge) abandon();

    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `resolve-${clock.now()}`,
    };

    context = operation;
    publish({
      ...store.getState(),
      session: {status: SESSION_STATUS.RESOLVING, generation: operation.generation, revision: 0},
      attempt: preserveChallenge
        ? store.getState().attempt
        : {method: store.getState().attempt.method, stage: LOGIN_STAGE.IDLE},
      pending: false,
      error: undefined,
    });
    await new Promise<void>((done) => {
      let finished = false;

      let cancelDeadline: () => void = () => undefined;

      const finish = (snapshot?: SessionSnapshot): void => {
        if (finished) return;

        finished = true;
        cancelDeadline();

        if (snapshot && context === operation) accept(snapshot, true);

        if (context === operation) cancelOperation = undefined;

        done();
      };

      cancelOperation = () => finish();
      cancelDeadline = clock.schedule(() => {
        void gateway.abandon(operation).catch(() => undefined);
        finish({
          status: SESSION_STATUS.UNAVAILABLE,
          generation: operation.generation,
          revision: 0,
          error: {code: AUTH_ERROR_CODE.TIMEOUT, messageKey: AUTH_ERROR_CODE.TIMEOUT},
        });

        if (context === operation) context = undefined;
      }, AUTH_TIMEOUT_MS.STANDARD);
      void gateway.resolveSession(operation).then(finish, () =>
        finish({
          status: SESSION_STATUS.UNAVAILABLE,
          generation: operation.generation,
          revision: 0,
          error: {code: AUTH_ERROR_CODE.UNEXPECTED, messageKey: AUTH_ERROR_CODE.UNEXPECTED},
        }),
      );
    });
  }

  const safeError = (code: SafeAuthError['code']): SafeAuthError => ({code, messageKey: code});

  async function submit(
    method: AuthMethod,
    stage: AuthViewState['attempt']['stage'],
    invoke: (operation: OperationContext) => Promise<AuthResult>,
  ): Promise<void> {
    if (
      disposed ||
      store.getState().pending ||
      store.getState().session.status !== SESSION_STATUS.SIGNED_OUT
    )
      return;

    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `auth-${clock.now()}`,
    };

    context = operation;
    publish({
      ...store.getState(),
      session: {status: SESSION_STATUS.SIGNED_OUT, generation: operation.generation, revision: 0},
      attempt: {...store.getState().attempt, method, stage},
      pending: true,
      error: undefined,
    });
    await new Promise<void>((done) => {
      let finished = false;

      let cancelTimer: () => void = () => undefined;

      let remaining: number =
        method === AUTH_METHOD.GOOGLE ? AUTH_TIMEOUT_MS.GOOGLE : AUTH_TIMEOUT_MS.STANDARD;
      let timerStarted = clock.now();

      const finish = (result?: AuthResult): void => {
        if (finished) return;

        finished = true;
        cancelTimer();
        pauseDeadline = undefined;
        resumeDeadline = undefined;

        if (context === operation && !disposed && result) {
          if ('kind' in result && result.kind === AUTH_RESULT_KIND.CHALLENGE) {
            publish({
              ...store.getState(),
              pending: false,
              attempt: {
                method,
                stage: LOGIN_STAGE.AWAITING_CODE,
                attemptId: result.attemptId,
                codePurpose: result.codePurpose,
                retryAfterSeconds: result.retryAfterSeconds,
              },
              error: undefined,
            });
          } else if ('kind' in result) {
            publish({
              ...store.getState(),
              pending: false,
              attempt: {
                ...store.getState().attempt,
                method: method === AUTH_METHOD.GOOGLE ? AUTH_METHOD.PASSWORD : method,
                stage: store.getState().attempt.attemptId
                  ? LOGIN_STAGE.AWAITING_CODE
                  : LOGIN_STAGE.FAILED,
              },
              error: {
                code: result.code,
                messageKey: result.messageKey,
                retryAfterSeconds: result.retryAfterSeconds,
              },
            });
          } else {
            accept(result, true);
            publish({
              ...store.getState(),
              pending: false,
              attempt: {method, stage: LOGIN_STAGE.IDLE},
            });
          }
        }

        if (context === operation) cancelOperation = undefined;

        done();
      };

      const timeout = (): void => {
        void gateway.abandon(operation).catch(() => undefined);

        if (context === operation)
          publish({...store.getState(), attempt: {method, stage: LOGIN_STAGE.FAILED}});

        finish({kind: AUTH_RESULT_KIND.ERROR, ...safeError(AUTH_ERROR_CODE.TIMEOUT)});

        if (context === operation) context = undefined;
      };

      const resume = (): void => {
        timerStarted = clock.now();
        cancelTimer = clock.schedule(timeout, remaining);
      };

      if (method === AUTH_METHOD.GOOGLE) {
        pauseDeadline = () => {
          cancelTimer();
          remaining = Math.max(0, remaining - (clock.now() - timerStarted));
        };
        resumeDeadline = resume;
      }

      cancelOperation = () => finish();

      if (method !== AUTH_METHOD.GOOGLE || foreground) resume();

      void invoke(operation).then(finish, () =>
        finish({kind: AUTH_RESULT_KIND.ERROR, ...safeError(AUTH_ERROR_CODE.UNEXPECTED)}),
      );
    });
  }

  async function logout(): Promise<void> {
    const session = store.getState().session;

    if (
      disposed ||
      store.getState().pending ||
      session.status !== SESSION_STATUS.ACTIVE ||
      !session.sessionId
    )
      return;

    const sessionId = session.sessionId;
    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `logout-${clock.now()}`,
    };

    context = operation;
    publish({
      ...store.getState(),
      session: {...store.getState().session, generation: operation.generation, revision: 0},
      pending: true,
      error: undefined,
    });
    await new Promise<void>((done) => {
      let finished = false;

      let cancelTimer: () => void = () => undefined;

      const finish = (snapshot?: SessionSnapshot): void => {
        if (finished) return;

        finished = true;
        cancelTimer();

        if (snapshot && context === operation && !disposed) {
          accept(snapshot, true);
          publish({
            ...store.getState(),
            pending: false,
            attempt: {method: AUTH_METHOD.PASSWORD, stage: LOGIN_STAGE.IDLE},
          });
        }

        if (context === operation) cancelOperation = undefined;

        done();
      };

      cancelOperation = () => finish();
      cancelTimer = clock.schedule(() => {
        void gateway.abandon(operation).catch(() => undefined);
        finish({
          status: SESSION_STATUS.UNAVAILABLE,
          generation: operation.generation,
          revision: store.getState().session.revision + 1,
          error: safeError(AUTH_ERROR_CODE.TIMEOUT),
        });

        if (context === operation) context = undefined;
      }, AUTH_TIMEOUT_MS.STANDARD);
      void gateway.signOut({...operation, sessionId}).then(finish, () =>
        finish({
          status: SESSION_STATUS.UNAVAILABLE,
          generation: operation.generation,
          revision: store.getState().session.revision + 1,
          error: safeError(AUTH_ERROR_CODE.UNEXPECTED),
        }),
      );
    });
  }

  function selectMethod(method: AuthMethod): void {
    if (disposed || store.getState().session.status !== SESSION_STATUS.SIGNED_OUT) return;

    abandon();
    context = {generation: clock.nextGeneration(), operationId: `select-${clock.now()}`};
    publish({
      session: {status: SESSION_STATUS.SIGNED_OUT, generation: context.generation, revision: 0},
      attempt: {method, stage: LOGIN_STAGE.IDLE},
      pending: false,
    });
  }

  async function start(): Promise<void> {
    if (started || disposed) return;

    started = true;

    try {
      unsubscribe = gateway.subscribe((snapshot) => accept(snapshot));
      await refresh();
    } catch {
      abandon();
      context = undefined;
      unsubscribe?.();
      unsubscribe = undefined;
      publish({
        ...store.getState(),
        session: {
          status: SESSION_STATUS.UNAVAILABLE,
          generation: clock.nextGeneration(),
          revision: 0,
        },
        error: safeError(AUTH_ERROR_CODE.UNEXPECTED),
      });
      started = false;
    }
  }

  return {
    getSnapshot: store.getState,
    subscribe: store.subscribe,

    start,
    refresh,

    login: async (method, email = '', password = '') => {
      if (store.getState().pending || disposed) return;

      const normalizedEmail = email.trim();

      if (
        method !== AUTH_METHOD.GOOGLE &&
        (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
          (method === AUTH_METHOD.PASSWORD && !password))
      ) {
        publish({...store.getState(), error: safeError(AUTH_ERROR_CODE.INVALID_INPUT)});

        return;
      }

      await submit(
        method,
        method === AUTH_METHOD.GOOGLE ? LOGIN_STAGE.AWAITING_PROVIDER : LOGIN_STAGE.SUBMITTING,
        (operation) =>
          method === AUTH_METHOD.GOOGLE
            ? gateway.google(operation)
            : method === AUTH_METHOD.PASSWORD
              ? gateway.password({...operation, email: normalizedEmail, password})
              : gateway.requestCode({...operation, email: normalizedEmail}),
      );
    },

    verify: async (code) => {
      const {attemptId, codePurpose, method} = store.getState().attempt;

      if (!attemptId || !codePurpose || !code.trim()) {
        publish({...store.getState(), error: safeError(AUTH_ERROR_CODE.INVALID_INPUT)});

        return;
      }

      await submit(method, LOGIN_STAGE.VERIFYING, (operation) =>
        gateway.verifyCode({...operation, attemptId, codePurpose, code: code.trim()}),
      );
    },

    resend: async () => {
      const {attemptId, codePurpose, method} = store.getState().attempt;

      if (!attemptId || !codePurpose) return;

      await submit(method, LOGIN_STAGE.SUBMITTING, (operation) =>
        gateway.resendCode({...operation, attemptId, codePurpose}),
      );
    },

    selectMethod,
    logout,

    setForeground: (next) => {
      if (next === foreground) return;

      foreground = next;

      if (store.getState().pending && store.getState().attempt.method === AUTH_METHOD.GOOGLE) {
        if (next) resumeDeadline?.();
        else pauseDeadline?.();
      } else if (
        next &&
        started &&
        !(store.getState().pending && store.getState().session.status === SESSION_STATUS.ACTIVE)
      )
        void refresh();
    },

    dispose: () => {
      abandon();
      disposed = true;
      unsubscribe?.();
      gateway.dispose();
    },
  };
}
