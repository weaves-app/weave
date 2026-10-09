import type {AuthErrorCode} from '../domain/auth-models';

export const authMessages: Readonly<Record<AuthErrorCode, string>> = {
  invalidInput: 'Enter a valid email address and the required password or code.',
  rejectedCredentials: 'The email or password was not accepted. Try again.',
  codeInvalid: 'That code was not accepted. Check it and try again.',
  codeExpired: 'That code has expired. Request another code.',
  rateLimited: 'Please wait before trying again.',
  existingAccountRequired: 'An existing account is required. Contact your administrator.',
  cancelled: 'Sign-in was cancelled. Choose a method to try again.',
  network: 'Unable to connect. Check your connection and try again.',
  timeout: 'The request took too long. Please try again.',
  configuration: 'Login is unavailable. Contact your administrator.',
  verificationRequired:
    'Your account requires verification that this app does not support. Choose another method or contact your administrator.',
  storage: 'Unable to access secure session storage. Please try again.',
  unexpected: 'Something went wrong. Please try again.',
};
