export type AuthMode = 'signup' | 'signin' | 'invitation';

export type AuthStage = 'credentials' | 'verification' | 'ready' | 'complete';

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface Attempt {
  readonly stage: 'credentials' | 'verification' | 'ready' | 'unsupported';
  readonly verified?: boolean;
}

export interface AuthGateway {
  current(mode: AuthMode): Attempt;
  signup(input: Credentials): Promise<Attempt>;
  signin(input: Credentials): Promise<Attempt>;
  google(mode: AuthMode): Promise<void>;
  invite(ticket: string, password: string): Promise<Attempt>;
  sendCode(mode: AuthMode): Promise<void>;
  verify(mode: AuthMode, code: string): Promise<Attempt>;
  activate(mode: AuthMode): Promise<string>;
  deactivate(): Promise<void>;
}

export interface AuthSnapshot {
  readonly stage: AuthStage;
  readonly pending: boolean;
  readonly error: string | null;
}

export interface AuthFlow {
  rebind(gateway: AuthGateway, complete: (url: string) => void): void;
  getSnapshot(): AuthSnapshot;
  subscribe(listener: () => void): () => void;
  submit(input: Credentials): Promise<void>;
  verify(code: string): Promise<void>;
  resend(): Promise<void>;
  google(): Promise<void>;
  signOut(): Promise<void>;
  cancel(): void;
}

export interface FlowOptions {
  readonly mode: AuthMode;
  readonly timeoutMilliseconds?: number;
  readonly ticket?: string;
  readonly complete: (url: string) => void;
}

export interface CallbackResult {
  readonly destination?: string;
  readonly error?: string;
}

export interface OAuthGateway {
  finish(): Promise<CallbackResult>;
}
