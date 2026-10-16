import {LANGUAGE} from './application/text-translator';
import type {TextTranslator} from './application/text-translator';
import {
  COUNT_MARKER,
  isDisplayText,
  isRetryTemplate,
  RETRY_UNIT,
  MESSAGE,
  ONE,
  ZERO,
  readCatalogEntry,
} from './messages';
import type {StaticMessageId} from './messages';
import {englishCatalog} from './resources/en';

export const SAFE_ERROR = 'Something went wrong. Please try again.';

export const SAFE_WAIT = 'Please wait before trying again.';

// Deliberately bounded emergency copy: field/action meaning survives a corrupt catalog.
const emergency: Readonly<Partial<Record<StaticMessageId, string>>> = {
  [MESSAGE.LOGIN_SUBMIT]: 'Log in',
  [MESSAGE.LOGIN_SEND_CODE]: 'Send code',
  [MESSAGE.LOGIN_GOOGLE]: 'Continue with Google',
  [MESSAGE.LOGIN_EMAIL_LABEL]: 'Email',
  [MESSAGE.LOGIN_EMAIL_PLACEHOLDER]: 'Email address',
  [MESSAGE.LOGIN_PASSWORD_LABEL]: 'Password',
  [MESSAGE.LOGIN_PASSWORD_PLACEHOLDER]: 'Enter your password',
  [MESSAGE.LOGIN_PASSWORD_METHOD]: 'Password',
  [MESSAGE.LOGIN_PASSWORD_METHOD_LABEL]: 'Email and password',
  [MESSAGE.LOGIN_EMAIL_CODE_METHOD]: 'Email code',
  [MESSAGE.VERIFICATION_ANOTHER_METHOD]: 'Choose another method',
  [MESSAGE.VERIFICATION_SUBMIT]: 'Verify code',
  [MESSAGE.VERIFICATION_RESEND]: 'Resend code',
  [MESSAGE.VERIFICATION_CODE_LABEL]: 'Verification code',
  [MESSAGE.VERIFICATION_CODE_HINT]: 'Enter or paste the six-digit code from your email',
  [MESSAGE.VERIFICATION_CODE_INSTRUCTIONS]: 'Enter the 6-digit code from your email.',
  [MESSAGE.RECOVERY_TITLE]: 'Something went wrong',
  [MESSAGE.RECOVERY_DESCRIPTION]: 'The app could not display this screen. Reload to try again.',
  [MESSAGE.RECOVERY_RELOAD]: 'Reload',
  [MESSAGE.HOME_LOGOUT]: 'Logout',
  [MESSAGE.COMMON_TRY_AGAIN]: 'Try again',
};

Object.freeze(emergency);

export function createSafeEnglishTranslator(catalog: unknown = englishCatalog): TextTranslator {
  return Object.freeze({
    language: LANGUAGE.ENGLISH,

    text: (id: StaticMessageId): string => {
      const entry = readCatalogEntry(catalog, id);

      return isDisplayText(entry) ? entry : (emergency[id] ?? SAFE_ERROR);
    },

    retryAfterSeconds: (count: unknown): string => {
      if (!isRetryCount(count)) return SAFE_WAIT;

      const id = count === ONE ? MESSAGE.RETRY_AFTER_ONE : MESSAGE.RETRY_AFTER_OTHER;
      const template = readCatalogEntry(catalog, id);

      if (isRetryTemplate(template, count)) {
        const result = template.replace(COUNT_MARKER, String(count));

        if (isDisplayText(result)) return result;
      }

      return `Try again after ${count} ${count === ONE ? RETRY_UNIT.ONE : RETRY_UNIT.OTHER}.`;
    },
  });
}

export interface RecoveryText {
  readonly title: string;
  readonly description: string;
  readonly reload: string;
}

export function recoveryText(catalog: unknown = englishCatalog): RecoveryText {
  const safe = createSafeEnglishTranslator(catalog);

  return Object.freeze({
    title: safe.text(MESSAGE.RECOVERY_TITLE),
    description: safe.text(MESSAGE.RECOVERY_DESCRIPTION),
    reload: safe.text(MESSAGE.RECOVERY_RELOAD),
  });
}

export function isRetryCount(count: unknown): count is number {
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= ZERO;
}
