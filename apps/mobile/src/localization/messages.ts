export const MESSAGE = {
  NOTIFICATIONS_TITLE: 'notifications.title',
  NOTIFICATIONS_EXPLANATION: 'notifications.explanation',
  NOTIFICATIONS_ENABLE: 'notifications.enable',
  NOTIFICATIONS_SETTINGS: 'notifications.settings',
  NOTIFICATIONS_RETRY: 'notifications.retry',
  NOTIFICATIONS_CHECKING: 'notifications.checking',
  NOTIFICATIONS_PENDING: 'notifications.pending',
  NOTIFICATIONS_READY: 'notifications.ready',
  NOTIFICATIONS_DISABLED: 'notifications.disabled',
  NOTIFICATIONS_RESTRICTED: 'notifications.restricted',
  NOTIFICATIONS_UNAVAILABLE: 'notifications.unavailable',
  NOTIFICATIONS_CONFIGURATION_UNAVAILABLE: 'notifications.configurationUnavailable',
  NOTIFICATIONS_RETRY_LATER: 'notifications.retryLater',

  BRAND_TAGLINE: 'brand.tagline',
  BRAND_STORY: 'brand.story',
  LOGIN_TITLE: 'login.title',
  LOGIN_SUBTITLE: 'login.subtitle',
  LOGIN_GOOGLE: 'login.google',
  LOGIN_EMAIL_DIVIDER: 'login.emailDivider',
  LOGIN_EMAIL_LABEL: 'login.emailLabel',
  LOGIN_EMAIL_PLACEHOLDER: 'login.emailPlaceholder',
  LOGIN_PASSWORD_LABEL: 'login.passwordLabel',
  LOGIN_PASSWORD_PLACEHOLDER: 'login.passwordPlaceholder',
  LOGIN_PASSWORD_METHOD: 'login.passwordMethod',
  LOGIN_PASSWORD_METHOD_LABEL: 'login.passwordMethodLabel',
  LOGIN_EMAIL_CODE_METHOD: 'login.emailCodeMethod',
  LOGIN_SEND_CODE: 'login.sendCode',
  LOGIN_SUBMIT: 'login.submit',
  VERIFICATION_ANOTHER_METHOD: 'verification.anotherMethod',
  VERIFICATION_DEVICE_TITLE: 'verification.deviceTitle',
  VERIFICATION_EMAIL_TITLE: 'verification.emailTitle',
  VERIFICATION_DESCRIPTION: 'verification.description',
  VERIFICATION_CODE_LABEL: 'verification.codeLabel',
  VERIFICATION_CODE_HINT: 'verification.codeHint',
  VERIFICATION_CODE_INSTRUCTIONS: 'verification.codeInstructions',
  VERIFICATION_SUBMIT: 'verification.submit',
  VERIFICATION_NOT_RECEIVED: 'verification.notReceived',
  VERIFICATION_RESEND: 'verification.resend',
  STATUS_CHECKING_SESSION: 'status.checkingSession',
  STATUS_VERIFYING_CODE: 'status.verifyingCode',
  STATUS_SENDING_CODE: 'status.sendingCode',
  STATUS_SIGNING_IN: 'status.signingIn',
  STATUS_SIGNING_OUT: 'status.signingOut',
  HOME_TITLE: 'home.title',
  HOME_LOGOUT: 'home.logout',
  COMMON_TRY_AGAIN: 'common.tryAgain',
  RETRY_AFTER_ONE: 'retry.after_one',
  RETRY_AFTER_OTHER: 'retry.after_other',
  RECOVERY_TITLE: 'recovery.title',
  RECOVERY_DESCRIPTION: 'recovery.description',
  RECOVERY_RELOAD: 'recovery.reload',
  AUTH_ERROR_INVALID_INPUT: 'auth.error.invalidInput',
  AUTH_ERROR_REJECTED_CREDENTIALS: 'auth.error.rejectedCredentials',
  AUTH_ERROR_CODE_INVALID: 'auth.error.codeInvalid',
  AUTH_ERROR_CODE_EXPIRED: 'auth.error.codeExpired',
  AUTH_ERROR_RATE_LIMITED: 'auth.error.rateLimited',
  AUTH_ERROR_EXISTING_ACCOUNT_REQUIRED: 'auth.error.existingAccountRequired',
  AUTH_ERROR_CANCELLED: 'auth.error.cancelled',
  AUTH_ERROR_NETWORK: 'auth.error.network',
  AUTH_ERROR_TIMEOUT: 'auth.error.timeout',
  AUTH_ERROR_CONFIGURATION: 'auth.error.configuration',
  AUTH_ERROR_VERIFICATION_REQUIRED: 'auth.error.verificationRequired',
  AUTH_ERROR_STORAGE: 'auth.error.storage',
  AUTH_ERROR_UNEXPECTED: 'auth.error.unexpected',
} as const;

export type MessageId = (typeof MESSAGE)[keyof typeof MESSAGE];

export type StaticMessageId = Exclude<
  MessageId,
  typeof MESSAGE.RETRY_AFTER_ONE | typeof MESSAGE.RETRY_AFTER_OTHER
>;

export interface EnglishCatalog {
  readonly [id: string]: string;
}

export const EMPTY_TEXT = '';

export const ZERO = 0;

export const ONE = 1;

export const TWO = 2;

export const RETRY_UNIT = {ONE: 'second', OTHER: 'seconds'} as const;

export const COUNT_MARKER = '{{count}}';

export const requiredMessageIds: readonly MessageId[] = Object.freeze(Object.values(MESSAGE));

const messageIds: ReadonlySet<string> = new Set(requiredMessageIds);

export function readCatalogEntry(candidate: unknown, id: MessageId): unknown {
  try {
    if (typeof candidate === 'object' && candidate !== null) return Reflect.get(candidate, id);
  } catch {
    return undefined;
  }

  return undefined;
}

export function isDisplayText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== EMPTY_TEXT &&
    !messageIds.has(value) &&
    !/{{|}}|\$t\(/.test(value)
  );
}

export function isRetryDisplay(value: unknown, count: number): value is string {
  if (!isDisplayText(value)) return false;

  const tokens = value.match(/[+-]?\d+(?:[.,]\d+)*/g);
  const unit = count === ONE ? RETRY_UNIT.ONE : RETRY_UNIT.OTHER;

  return (
    tokens?.length === ONE &&
    tokens[ZERO] === String(count) &&
    new RegExp(`\\b${count} ${unit}\\b`).test(value)
  );
}

export function isRetryTemplate(value: unknown, example: number): value is string {
  return (
    typeof value === 'string' &&
    value.split(COUNT_MARKER).length === TWO &&
    isRetryDisplay(value.replace(COUNT_MARKER, String(example)), example)
  );
}

export function validateEnglishCatalog(candidate: unknown): readonly MessageId[] {
  return requiredMessageIds.filter((id) => {
    const value = readCatalogEntry(candidate, id);

    if (id === MESSAGE.RETRY_AFTER_ONE || id === MESSAGE.RETRY_AFTER_OTHER)
      return !isRetryTemplate(value, id === MESSAGE.RETRY_AFTER_ONE ? ONE : TWO);

    return !isDisplayText(value);
  });
}
