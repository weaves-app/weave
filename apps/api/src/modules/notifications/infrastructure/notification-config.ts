import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';

export interface NotificationConfig {
  readonly appId: string;
  readonly privateKey: string;
  readonly budgetSecret: string;
}

export interface SettingReader {
  get(name: string): unknown;
}

export const CONFIG_POLICY = {SECRET_LENGTH: 32} as const;

export function notificationConfig(settings: SettingReader): NotificationConfig {
  const appId = settings.get('ONESIGNAL_APP_ID');
  const privateKey = settings.get('ONESIGNAL_IDENTITY_PRIVATE_KEY');
  const budgetSecret = settings.get('NOTIFICATION_BUDGET_HMAC_KEY');

  if (
    typeof appId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(appId) ||
    typeof privateKey !== 'string' ||
    !privateKey.includes('-----BEGIN PRIVATE KEY-----') ||
    typeof budgetSecret !== 'string' ||
    budgetSecret.length < CONFIG_POLICY.SECRET_LENGTH
  )
    throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});

  return {appId, privateKey, budgetSecret};
}
