import type {AuthenticationGateway, OperationContext} from '../application/authentication-gateway';
import type {Clock} from '../application/clock';
import type {AuthResult, SessionSnapshot} from '../domain/auth-models';
export function active(context: OperationContext, revision = 1): SessionSnapshot {
  return {
    status: 'active',
    generation: context.generation,
    revision,
    validatedAt: 1000,
    sessionId: 'session',
    accountId: 'account',
  };
}
export function signedOut(context: OperationContext, revision = 1): SessionSnapshot {
  return {status: 'signedOut', generation: context.generation, revision};
}
export function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((callback) => {
    resolve = callback;
  });
  return {promise, resolve};
}
export class TestClock implements Clock {
  private generation = 0;
  now(): number {
    return Date.now();
  }
  nextGeneration(): number {
    return ++this.generation;
  }
  schedule(callback: () => void, delayMs: number): () => void {
    const handle = setTimeout(callback, delayMs);
    return () => clearTimeout(handle);
  }
}
export class TestGateway implements AuthenticationGateway {
  resolveResult: (context: OperationContext) => Promise<SessionSnapshot> = async (context) =>
    signedOut(context);
  loginResult: (context: OperationContext) => Promise<AuthResult> = async (context) =>
    active(context);
  signOutResult: (context: OperationContext) => Promise<SessionSnapshot> = async (context) =>
    signedOut(context);
  readonly abandoned: OperationContext[] = [];
  readonly requests: {readonly method: string; readonly input: OperationContext}[] = [];
  private observer?: (value: SessionSnapshot) => void;
  disposed = false;
  resolveSession(input: OperationContext): Promise<SessionSnapshot> {
    this.requests.push({method: 'resolve', input});
    return this.resolveResult(input);
  }
  subscribe(observer: (value: SessionSnapshot) => void): () => void {
    this.observer = observer;
    return () => {
      this.observer = undefined;
    };
  }
  emit(value: SessionSnapshot): void {
    this.observer?.(value);
  }
  password(input: OperationContext): Promise<AuthResult> {
    this.requests.push({method: 'password', input});
    return this.loginResult(input);
  }
  requestCode(input: OperationContext): Promise<AuthResult> {
    this.requests.push({method: 'requestCode', input});
    return this.loginResult(input);
  }
  verifyCode(input: OperationContext): Promise<AuthResult> {
    this.requests.push({method: 'verifyCode', input});
    return this.loginResult(input);
  }
  resendCode(input: OperationContext): Promise<AuthResult> {
    this.requests.push({method: 'resendCode', input});
    return this.loginResult(input);
  }
  google(input: OperationContext): Promise<AuthResult> {
    this.requests.push({method: 'google', input});
    return this.loginResult(input);
  }
  signOut(input: OperationContext): Promise<SessionSnapshot> {
    this.requests.push({method: 'signOut', input});
    return this.signOutResult(input);
  }
  async abandon(input: OperationContext): Promise<void> {
    this.abandoned.push(input);
  }
  dispose(): void {
    this.disposed = true;
    this.observer = undefined;
  }
}
