export const NATIVE_AUTH_COMMAND = {
  RESOLVE_SESSION: 'resolveSession',
  PASSWORD: 'password',
  REQUEST_CODE: 'requestCode',
  VERIFY_CODE: 'verifyCode',
  RESEND_CODE: 'resendCode',
  GOOGLE: 'google',
  SIGN_OUT: 'signOut',
  ABANDON: 'abandon',
} as const;

export type NativeAuthCommand = (typeof NATIVE_AUTH_COMMAND)[keyof typeof NATIVE_AUTH_COMMAND];
