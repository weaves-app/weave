import {AUTH_ERROR_CODE} from '../domain/auth-models';
import type {AuthErrorCode} from '../domain/auth-models';
import type {TextTranslator} from '../../localization/application/text-translator';
import {MESSAGE} from '../../localization/messages';
import type {StaticMessageId} from '../../localization/messages';

const messageIds: Readonly<Record<AuthErrorCode, StaticMessageId>> = {
  [AUTH_ERROR_CODE.INVALID_INPUT]: MESSAGE.AUTH_ERROR_INVALID_INPUT,
  [AUTH_ERROR_CODE.REJECTED_CREDENTIALS]: MESSAGE.AUTH_ERROR_REJECTED_CREDENTIALS,
  [AUTH_ERROR_CODE.CODE_INVALID]: MESSAGE.AUTH_ERROR_CODE_INVALID,
  [AUTH_ERROR_CODE.CODE_EXPIRED]: MESSAGE.AUTH_ERROR_CODE_EXPIRED,
  [AUTH_ERROR_CODE.RATE_LIMITED]: MESSAGE.AUTH_ERROR_RATE_LIMITED,
  [AUTH_ERROR_CODE.EXISTING_ACCOUNT_REQUIRED]: MESSAGE.AUTH_ERROR_EXISTING_ACCOUNT_REQUIRED,
  [AUTH_ERROR_CODE.CANCELLED]: MESSAGE.AUTH_ERROR_CANCELLED,
  [AUTH_ERROR_CODE.NETWORK]: MESSAGE.AUTH_ERROR_NETWORK,
  [AUTH_ERROR_CODE.TIMEOUT]: MESSAGE.AUTH_ERROR_TIMEOUT,
  [AUTH_ERROR_CODE.CONFIGURATION]: MESSAGE.AUTH_ERROR_CONFIGURATION,
  [AUTH_ERROR_CODE.VERIFICATION_REQUIRED]: MESSAGE.AUTH_ERROR_VERIFICATION_REQUIRED,
  [AUTH_ERROR_CODE.STORAGE]: MESSAGE.AUTH_ERROR_STORAGE,
  [AUTH_ERROR_CODE.UNEXPECTED]: MESSAGE.AUTH_ERROR_UNEXPECTED,
};

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return Object.values(AUTH_ERROR_CODE).some((code) => code === value);
}

export function resolveAuthMessage(code: unknown, text: TextTranslator): string {
  return text.text(messageIds[isAuthErrorCode(code) ? code : AUTH_ERROR_CODE.UNEXPECTED]);
}
