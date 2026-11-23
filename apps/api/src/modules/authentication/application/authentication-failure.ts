export const AUTHENTICATION_FAILURE = {
  REQUIRED: 'authentication_required',
  UNAVAILABLE: 'authentication_unavailable',
} as const;

export interface AuthenticationFailureOptions {
  readonly code: (typeof AUTHENTICATION_FAILURE)[keyof typeof AUTHENTICATION_FAILURE];
}

export class AuthenticationFailure extends Error {
  readonly code: AuthenticationFailureOptions['code'];

  constructor(options: AuthenticationFailureOptions) {
    super(options.code);
    this.code = options.code;
  }
}
