export const AUTH_MODE = {
  SIGN_UP: 'signup',
  SIGN_IN: 'signin',
  INVITATION: 'invitation',
} as const;

export const AUTH_STAGE = {
  CREDENTIALS: 'credentials',
  VERIFICATION: 'verification',
  READY: 'ready',
  COMPLETE: 'complete',
  UNSUPPORTED: 'unsupported',
} as const;

export const ACCESS_STATUS = {
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  UNVERIFIED: 'unverified',
  UNAVAILABLE: 'unavailable',
  ORGANIZATION_REQUIRED: 'organization-required',
} as const;

export const SESSION_TASK = {
  CHOOSE_ORGANIZATION: 'choose-organization',
} as const;
