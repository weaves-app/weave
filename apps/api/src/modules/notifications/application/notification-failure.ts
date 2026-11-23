export const NOTIFICATION_ERROR = {
  INVALID: 'invalid_request',
  UNAVAILABLE: 'notifications_unavailable',
  RETRY: 'retry_later',
  TOO_LARGE: 'request_too_large',
} as const;

export interface NotificationFailureOptions {
  readonly code: (typeof NOTIFICATION_ERROR)[keyof typeof NOTIFICATION_ERROR];
  readonly retryAfterSeconds?: number;
}

export class NotificationFailure extends Error {
  readonly code: NotificationFailureOptions['code'];
  readonly retryAfterSeconds: number | undefined;

  constructor(options: NotificationFailureOptions) {
    super(options.code);
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
