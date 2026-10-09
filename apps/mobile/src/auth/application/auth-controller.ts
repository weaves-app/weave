import type {OperationContext, AuthenticationGateway} from './authentication-gateway';
import type {Clock} from './clock';
import type {
  AuthMethod,
  AuthViewState,
  SessionSnapshot,
  AuthResult,
  SafeAuthError,
} from '../domain/auth-models';
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
export function createAuthController(gateway: AuthenticationGateway, clock: Clock): AuthController {
  let state: AuthViewState = {
    session: {status: 'resolving', generation: 0, revision: 0},
    attempt: {method: 'password', stage: 'idle'},
    pending: false,
  };
  const listeners = new Set<() => void>();
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
    state = next;
    listeners.forEach((listener) => listener());
  }
  function accept(snapshot: SessionSnapshot, fromCommand = false): void {
    if (
      fromCommand &&
      snapshot.status === 'unavailable' &&
      context?.generation === snapshot.generation
    ) {
      publish({
        ...state,
        session: {...snapshot, revision: Math.max(snapshot.revision, state.session.revision)},
        error: snapshot.error,
      });
      return;
    }
    if (
      !context ||
      snapshot.generation !== context.generation ||
      snapshot.revision < state.session.revision ||
      (snapshot.revision === state.session.revision &&
        state.session.status !== 'resolving' &&
        !fromCommand)
    )
      return;
    publish({...state, session: snapshot, error: snapshot.error});
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
    const preserveChallenge = !state.pending && state.attempt.stage === 'awaitingCode';
    if (!preserveChallenge) abandon();
    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `resolve-${clock.now()}`,
    };
    context = operation;
    publish({
      ...state,
      session: {status: 'resolving', generation: operation.generation, revision: 0},
      attempt: preserveChallenge ? state.attempt : {method: state.attempt.method, stage: 'idle'},
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
          status: 'unavailable',
          generation: operation.generation,
          revision: 0,
          error: {code: 'timeout', messageKey: 'timeout'},
        });
        if (context === operation) context = undefined;
      }, 30_000);
      void gateway.resolveSession(operation).then(finish, () =>
        finish({
          status: 'unavailable',
          generation: operation.generation,
          revision: 0,
          error: {code: 'unexpected', messageKey: 'unexpected'},
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
    if (disposed || state.pending || state.session.status !== 'signedOut') return;
    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `auth-${clock.now()}`,
    };
    context = operation;
    publish({
      ...state,
      session: {status: 'signedOut', generation: operation.generation, revision: 0},
      attempt: {...state.attempt, method, stage},
      pending: true,
      error: undefined,
    });
    await new Promise<void>((done) => {
      let finished = false;
      let cancelTimer: () => void = () => undefined;
      let remaining = method === 'google' ? 120_000 : 30_000;
      let timerStarted = clock.now();
      const finish = (result?: AuthResult): void => {
        if (finished) return;
        finished = true;
        cancelTimer();
        pauseDeadline = undefined;
        resumeDeadline = undefined;
        if (context === operation && !disposed && result) {
          if ('kind' in result && result.kind === 'challenge') {
            publish({
              ...state,
              pending: false,
              attempt: {
                method,
                stage: 'awaitingCode',
                attemptId: result.attemptId,
                codePurpose: result.codePurpose,
                retryAfterSeconds: result.retryAfterSeconds,
              },
              error: undefined,
            });
          } else if ('kind' in result) {
            publish({
              ...state,
              pending: false,
              attempt: {
                ...state.attempt,
                method: method === 'google' ? 'password' : method,
                stage: state.attempt.attemptId ? 'awaitingCode' : 'failed',
              },
              error: {
                code: result.code,
                messageKey: result.messageKey,
                retryAfterSeconds: result.retryAfterSeconds,
              },
            });
          } else {
            accept(result, true);
            publish({...state, pending: false, attempt: {method, stage: 'idle'}});
          }
        }
        if (context === operation) cancelOperation = undefined;
        done();
      };
      const timeout = (): void => {
        void gateway.abandon(operation).catch(() => undefined);
        if (context === operation) publish({...state, attempt: {method, stage: 'failed'}});
        finish({kind: 'error', ...safeError('timeout')});
        if (context === operation) context = undefined;
      };
      const resume = (): void => {
        timerStarted = clock.now();
        cancelTimer = clock.schedule(timeout, remaining);
      };
      if (method === 'google') {
        pauseDeadline = () => {
          cancelTimer();
          remaining = Math.max(0, remaining - (clock.now() - timerStarted));
        };
        resumeDeadline = resume;
      }
      cancelOperation = () => finish();
      if (method !== 'google' || foreground) resume();
      void invoke(operation).then(finish, () =>
        finish({kind: 'error', ...safeError('unexpected')}),
      );
    });
  }
  async function logout(): Promise<void> {
    if (disposed || state.pending || state.session.status !== 'active' || !state.session.sessionId)
      return;
    const sessionId = state.session.sessionId;
    const operation: OperationContext = {
      generation: clock.nextGeneration(),
      operationId: `logout-${clock.now()}`,
    };
    context = operation;
    publish({
      ...state,
      session: {...state.session, generation: operation.generation, revision: 0},
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
          publish({...state, pending: false, attempt: {method: 'password', stage: 'idle'}});
        }
        if (context === operation) cancelOperation = undefined;
        done();
      };
      cancelOperation = () => finish();
      cancelTimer = clock.schedule(() => {
        void gateway.abandon(operation).catch(() => undefined);
        finish({
          status: 'unavailable',
          generation: operation.generation,
          revision: state.session.revision + 1,
          error: safeError('timeout'),
        });
        if (context === operation) context = undefined;
      }, 30_000);
      void gateway.signOut({...operation, sessionId}).then(finish, () =>
        finish({
          status: 'unavailable',
          generation: operation.generation,
          revision: state.session.revision + 1,
          error: safeError('unexpected'),
        }),
      );
    });
  }
  function selectMethod(method: AuthMethod): void {
    if (disposed || state.session.status !== 'signedOut') return;
    abandon();
    context = {generation: clock.nextGeneration(), operationId: `select-${clock.now()}`};
    publish({
      session: {status: 'signedOut', generation: context.generation, revision: 0},
      attempt: {method, stage: 'idle'},
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
        ...state,
        session: {status: 'unavailable', generation: clock.nextGeneration(), revision: 0},
        error: safeError('unexpected'),
      });
      started = false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    refresh,
    login: async (method, email = '', password = '') => {
      if (state.pending || disposed) return;
      const normalizedEmail = email.trim();
      if (
        method !== 'google' &&
        (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
          (method === 'password' && !password))
      ) {
        publish({...state, error: safeError('invalidInput')});
        return;
      }
      await submit(method, method === 'google' ? 'awaitingProvider' : 'submitting', (operation) =>
        method === 'google'
          ? gateway.google(operation)
          : method === 'password'
            ? gateway.password({...operation, email: normalizedEmail, password})
            : gateway.requestCode({...operation, email: normalizedEmail}),
      );
    },
    verify: async (code) => {
      const {attemptId, codePurpose, method} = state.attempt;
      if (!attemptId || !codePurpose || !code.trim()) {
        publish({...state, error: safeError('invalidInput')});
        return;
      }
      await submit(method, 'verifying', (operation) =>
        gateway.verifyCode({...operation, attemptId, codePurpose, code: code.trim()}),
      );
    },
    resend: async () => {
      const {attemptId, codePurpose, method} = state.attempt;
      if (!attemptId || !codePurpose) return;
      await submit(method, 'submitting', (operation) =>
        gateway.resendCode({...operation, attemptId, codePurpose}),
      );
    },
    selectMethod,
    logout,
    setForeground: (next) => {
      if (next === foreground) return;
      foreground = next;
      if (state.pending && state.attempt.method === 'google') {
        if (next) resumeDeadline?.();
        else pauseDeadline?.();
      } else if (next && started && !(state.pending && state.session.status === 'active'))
        void refresh();
    },
    dispose: () => {
      abandon();
      disposed = true;
      unsubscribe?.();
      gateway.dispose();
      listeners.clear();
    },
  };
}
