export const VERIFICATION_CODE_LENGTH = 6;

export const SESSION_STATUS = {
  RESOLVING: 'resolving',
  SIGNED_OUT: 'signedOut',
  ACTIVE: 'active',
  UNAVAILABLE: 'unavailable',
} as const;

export const AUTH_METHOD = {
  PASSWORD: 'password',
  EMAIL_CODE: 'emailCode',
  GOOGLE: 'google',
} as const;

export const CODE_PURPOSE = {
  SIGN_IN: 'signIn',
  DEVICE_TRUST: 'deviceTrust',
} as const;

export const LOGIN_STAGE = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  AWAITING_CODE: 'awaitingCode',
  VERIFYING: 'verifying',
  AWAITING_PROVIDER: 'awaitingProvider',
  FAILED: 'failed',
} as const;

export const AUTH_RESULT_KIND = {
  CHALLENGE: 'challenge',
  ERROR: 'error',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD];

export type CodePurpose = (typeof CODE_PURPOSE)[keyof typeof CODE_PURPOSE];

export const AUTH_ERROR_CODE = {
  INVALID_INPUT: 'invalidInput',
  REJECTED_CREDENTIALS: 'rejectedCredentials',
  CODE_INVALID: 'codeInvalid',
  CODE_EXPIRED: 'codeExpired',
  RATE_LIMITED: 'rateLimited',
  EXISTING_ACCOUNT_REQUIRED: 'existingAccountRequired',
  CANCELLED: 'cancelled',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  CONFIGURATION: 'configuration',
  VERIFICATION_REQUIRED: 'verificationRequired',
  STORAGE: 'storage',
  UNEXPECTED: 'unexpected',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];

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
  readonly kind: typeof AUTH_RESULT_KIND.CHALLENGE;
  readonly attemptId: string;
  readonly codePurpose: CodePurpose;
  readonly retryAfterSeconds?: number;
}

export interface AuthFailure extends SafeAuthError {
  readonly kind: typeof AUTH_RESULT_KIND.ERROR;
}

export type AuthResult = SessionSnapshot | CodeChallenge | AuthFailure;

export interface LoginAttempt {
  readonly method: AuthMethod;
  readonly stage: (typeof LOGIN_STAGE)[keyof typeof LOGIN_STAGE];
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
