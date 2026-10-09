export type SessionStatus = 'resolving' | 'signedOut' | 'active' | 'unavailable';
export type AuthMethod = 'password' | 'emailCode' | 'google';
export type CodePurpose = 'signIn' | 'deviceTrust';
export type AuthErrorCode =
  | 'invalidInput'
  | 'rejectedCredentials'
  | 'codeInvalid'
  | 'codeExpired'
  | 'rateLimited'
  | 'existingAccountRequired'
  | 'cancelled'
  | 'network'
  | 'timeout'
  | 'configuration'
  | 'verificationRequired'
  | 'storage'
  | 'unexpected';
export interface SafeAuthError {
  readonly code: AuthErrorCode;
  readonly messageKey: AuthErrorCode;
  readonly retryAfterSeconds?: number;
}
export interface SessionSnapshot {
  readonly status: SessionStatus;
  readonly generation: number;
  readonly revision: number;
  readonly validatedAt?: number;
  readonly sessionId?: string;
  readonly accountId?: string;
  readonly error?: SafeAuthError;
}
export interface CodeChallenge {
  readonly kind: 'challenge';
  readonly attemptId: string;
  readonly codePurpose: CodePurpose;
  readonly retryAfterSeconds?: number;
}
export interface AuthFailure extends SafeAuthError {
  readonly kind: 'error';
}
export type AuthResult = SessionSnapshot | CodeChallenge | AuthFailure;
export interface LoginAttempt {
  readonly method: AuthMethod;
  readonly stage:
    'idle' | 'submitting' | 'awaitingCode' | 'verifying' | 'awaitingProvider' | 'failed';
  readonly attemptId?: string;
  readonly codePurpose?: CodePurpose;
  readonly retryAfterSeconds?: number;
}
export interface AuthViewState {
  readonly session: SessionSnapshot;
  readonly attempt: LoginAttempt;
  readonly pending: boolean;
  readonly error?: SafeAuthError;
}
