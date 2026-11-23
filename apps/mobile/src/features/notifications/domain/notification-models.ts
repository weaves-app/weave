export const NOTIFICATION_PERMISSION = {
  UNDETERMINED: 'undetermined',
  ALLOWED: 'allowed',
  DENIED: 'denied',
  RESTRICTED: 'restricted',
  UNAVAILABLE: 'unavailable',
} as const;

export const NOTIFICATION_STATUS = {
  HIDDEN: 'hidden',
  PERMISSION_NEEDED: 'permission-needed',
  DISABLED: 'disabled',
  PENDING: 'pending',
  READY: 'ready',
  UNAVAILABLE: 'unavailable',
} as const;

export const NOTIFICATION_RESULT = {
  READY: 'ready',
  PENDING: 'pending',
  UNAVAILABLE: 'unavailable',
  UNAUTHORIZED: 'unauthorized',
  RATE_LIMITED: 'rate-limited',
} as const;

export const NOTIFICATION_LIMIT = {
  ZERO: 0,
  MAX_PROOF_MS: 60000,
  MAX_RETRY_SECONDS: 60,
  MIN_RETRY_SECONDS: 1,
  MS_PER_SECOND: 1000,
} as const;

export type NotificationPermission =
  (typeof NOTIFICATION_PERMISSION)[keyof typeof NOTIFICATION_PERMISSION];

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export interface NotificationContext {
  readonly rootLease: string;
  readonly generation: number;
  readonly sessionId: string;
  readonly accountId: string;
}

export interface NotificationObservation {
  readonly rootLease: string;
  readonly generation: number;
  readonly revision: number;
  readonly permission: NotificationPermission;
  readonly canRequest: boolean;
  readonly registrationPresent: boolean;
  readonly enabled: boolean;
  readonly matchesCurrentAccount: boolean;
}

export interface NotificationReadiness {
  readonly rootLease: string;
  readonly generation: number;
  readonly revision: number;
  readonly attemptId: string;
  readonly status: (typeof NOTIFICATION_RESULT)[keyof typeof NOTIFICATION_RESULT];
  readonly remainingValidityMs: number;
  readonly retryAfterSeconds?: number;
}

export interface NotificationState {
  readonly status: NotificationStatus;
  readonly permission: NotificationPermission;
  readonly canRequest: boolean;
  readonly busy: boolean;
  readonly retryBlocked: boolean;
}

export const INITIAL_NOTIFICATION_STATE: NotificationState = Object.freeze({
  status: NOTIFICATION_STATUS.HIDDEN,
  permission: NOTIFICATION_PERMISSION.UNAVAILABLE,
  canRequest: false,
  busy: false,
  retryBlocked: false,
});
