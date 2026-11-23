import {createSafeEnglishTranslator, recoveryText} from './safe-english';
import {MESSAGE} from './messages';
import {completeEnglishFixture} from './testing/english-fixture';

test('WEA-28 S05 uses approved static English and preserves exact emergency actions', () => {
  expect(createSafeEnglishTranslator(completeEnglishFixture).text(MESSAGE.LOGIN_SUBMIT)).toBe(
    'Log in',
  );

  const safe = createSafeEnglishTranslator({});

  expect(safe.text(MESSAGE.RECOVERY_RELOAD)).toBe('Reload');
  expect(safe.text(MESSAGE.HOME_LOGOUT)).toBe('Logout');
  expect(safe.text(MESSAGE.LOGIN_EMAIL_LABEL)).toBe('Email');
  expect(safe.text(MESSAGE.LOGIN_PASSWORD_LABEL)).toBe('Password');
});

test.each(['', '  ', {}, 'login.submit', '{{count}}'])(
  'WEA-28 S05 never exposes unusable static text %p',
  (value) => {
    expect(createSafeEnglishTranslator({'login.submit': value}).text(MESSAGE.LOGIN_SUBMIT)).toBe(
      'Log in',
    );
  },
);

test('WEA-28 S05 pure fallback works without Intl and never echoes corrupt resource text', () => {
  const saved = global.Intl;

  Object.defineProperty(global, 'Intl', {value: undefined, configurable: true});

  try {
    const safe = createSafeEnglishTranslator(null);

    for (const id of Object.values(MESSAGE).filter(
      (id) => id !== MESSAGE.RETRY_AFTER_ONE && id !== MESSAGE.RETRY_AFTER_OTHER,
    )) {
      expect(safe.text(id)).toMatch(/\S/);
    }
  } finally {
    Object.defineProperty(global, 'Intl', {value: saved, configurable: true});
  }
});

test('WEA-28 S06 corrupt canonical recovery copy preserves the pure emergency action', () => {
  expect(recoveryText({})).toEqual({
    title: 'Something went wrong',
    description: 'The app could not display this screen. Reload to try again.',
    reload: 'Reload',
  });

  const saved = global.Intl;

  Object.defineProperty(global, 'Intl', {value: undefined, configurable: true});

  try {
    expect(recoveryText(null).reload).toBe('Reload');
  } finally {
    Object.defineProperty(global, 'Intl', {value: saved, configurable: true});
  }
});

test('WEA-28 S05 pure fallback rejects nesting rather than displaying a marker', () => {
  expect(
    createSafeEnglishTranslator({'login.submit': '$t(unknown.translation)'}).text(
      MESSAGE.LOGIN_SUBMIT,
    ),
  ).toBe('Log in');
});

test('WEA-28 S04/S05 pure fallback rejects numeric adjacency to its count placeholder', () => {
  expect(
    createSafeEnglishTranslator({
      'retry.after_one': 'Try again after {{count}}0 seconds.',
    }).retryAfterSeconds(1),
  ).toBe('Try again after 1 second.');
});
