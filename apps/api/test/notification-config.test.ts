import assert from 'node:assert/strict';
import {test} from 'node:test';

import {notificationConfig} from '../src/modules/notifications/infrastructure/notification-config';

export const CONFIG_TEST_FIELD = {
  APP: 'ONESIGNAL_APP_ID',
  HMAC: 'NOTIFICATION_BUDGET_HMAC_KEY',
} as const;

void test('S11 notification config fails closed for missing/malformed app or secrets', () => {
  const base: Record<string, string> = {
    ONESIGNAL_APP_ID: 'c603d229-463e-4d9a-ae5f-5f40eb8c6a48',
    ONESIGNAL_IDENTITY_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----',
    NOTIFICATION_BUDGET_HMAC_KEY: '12345678901234567890123456789012',
  };

  assert.equal(notificationConfig({get: (key) => base[key]}).appId, base.ONESIGNAL_APP_ID);

  for (const name of Object.keys(base))
    assert.throws(
      () => notificationConfig({get: (key) => (key === name ? undefined : base[key])}),
      {code: 'notifications_unavailable'},
    );

  assert.throws(
    () =>
      notificationConfig({
        get: (key) => (key === CONFIG_TEST_FIELD.APP ? 'https://evil.test' : base[key]),
      }),
    {code: 'notifications_unavailable'},
  );
  assert.throws(
    () =>
      notificationConfig({
        get: (key) => (key === CONFIG_TEST_FIELD.HMAC ? 'short' : base[key]),
      }),
    {code: 'notifications_unavailable'},
  );
});
