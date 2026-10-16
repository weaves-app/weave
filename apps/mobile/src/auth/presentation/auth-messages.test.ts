import {resolveAuthMessage} from './auth-messages';
import {AUTH_ERROR_CODE} from '../domain/auth-models';
import {createSentinelLocalization} from '../../localization/testing/sentinel-localization';

test('WEA-28 S01 safe auth codes resolve through the presentation translator', () => {
  const text = createSentinelLocalization().translator;

  for (const code of Object.values(AUTH_ERROR_CODE)) {
    expect(resolveAuthMessage(code, text)).toMatch(/^English fixture: /);
  }

  expect(resolveAuthMessage(AUTH_ERROR_CODE.NETWORK, text)).toBe(
    'English fixture: Unable to connect. Check your connection and try again.',
  );
});

test.each([undefined, 'provider-secret-value', {}, '__proto__'])(
  'WEA-28 S05 unknown auth code %p uses safe English',
  (code) => {
    expect(resolveAuthMessage(code, createSentinelLocalization().translator)).toBe(
      'English fixture: Something went wrong. Please try again.',
    );
  },
);
