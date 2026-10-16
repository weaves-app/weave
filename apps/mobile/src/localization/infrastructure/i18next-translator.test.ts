import {createInstance} from 'i18next';

import {createI18nextTranslator} from './i18next-translator';
import {MESSAGE} from '../messages';
import {englishCatalog} from '../resources/en';

test('WEA-28 S01/S05 uses scoped bundled resources synchronously', () => {
  const translator = createI18nextTranslator({
    catalog: {...englishCatalog, 'login.submit': 'Enter this workspace'},
  });

  expect(translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Enter this workspace');
});

test('WEA-28 S07 engines own independent copied resource trees', () => {
  const firstEngine = createInstance();
  const secondEngine = createInstance();
  const first = createI18nextTranslator({createEngine: () => firstEngine});
  const second = createI18nextTranslator({createEngine: () => secondEngine});

  expect(firstEngine.isInitialized).toBe(true);
  expect(secondEngine.isInitialized).toBe(true);
  firstEngine.addResource('en', 'translation', 'login.submit', 'Enter first workspace');
  expect(first.text(MESSAGE.LOGIN_SUBMIT)).toBe('Enter first workspace');
  expect(second.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  expect(englishCatalog['login.submit']).toBe('Log in');
});

test.each(['', 'login.submit', '{{credential}}', {value: 'bad'}])(
  'WEA-28 S05 rejects invalid engine output %p',
  (value) => {
    const engine = createInstance();
    const translator = createI18nextTranslator({createEngine: () => engine});

    expect(engine.isInitialized).toBe(true);
    engine.addResourceBundle('en', 'translation', {'login.submit': value}, true, true);
    expect(translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  },
);

test('WEA-28 S05 unavailable engine/resource has readable canonical English', () => {
  const engine = createInstance();
  const translator = createI18nextTranslator({createEngine: () => engine});

  expect(engine.isInitialized).toBe(true);
  engine.removeResourceBundle('en', 'translation');
  expect(translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  expect(
    createI18nextTranslator({
      createEngine: () => {
        throw new Error('engine fault');
      },
    }).text(MESSAGE.RECOVERY_RELOAD),
  ).toBe('Reload');
});

test.each(['{{count}} seconds {{count}}', 'retry.after', '', '{{unknown}}'])(
  'WEA-28 S05 rejects corrupt plural %p',
  (template) => {
    const engine = createInstance();
    const text = createI18nextTranslator({createEngine: () => engine});

    engine.addResourceBundle('en', 'translation', {'retry.after_one': template}, true, true);
    expect(text.retryAfterSeconds(1)).toBe('Try again after 1 second.');
  },
);

test('WEA-28 S05 formatter exceptions and missing Intl plural rules keep readable text without loading resources', () => {
  const engine = createInstance();
  const text = createI18nextTranslator({createEngine: () => engine});

  jest.spyOn(engine, 't').mockImplementation(() => {
    throw new Error('synthetic formatter fault');
  });
  expect(text.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  expect(text.retryAfterSeconds(1)).toBe('Try again after 1 second.');

  const saved = Intl.PluralRules;

  Object.defineProperty(Intl, 'PluralRules', {value: undefined, configurable: true});

  try {
    expect(createI18nextTranslator().retryAfterSeconds(2)).toBe('Try again after 2 seconds.');
  } finally {
    Object.defineProperty(Intl, 'PluralRules', {value: saved, configurable: true});
  }
});

test('WEA-28 S06 bundled text never fetches translation resources when offline', () => {
  const network = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

  try {
    const text = createI18nextTranslator();

    expect(text.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
    expect(text.retryAfterSeconds(1)).toBe('Try again after 1 second.');
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

test.each([
  'Try again after 10 seconds.',
  'Try again after {{count}}0 seconds.',
  'Try again after -{{count}} seconds.',
  'Try again after {{count}}.0 seconds.',
])('WEA-28 S04/S05 rejects a resource that changes the numeric token: %p', (template) => {
  const engine = createInstance();
  const text = createI18nextTranslator({createEngine: () => engine});

  engine.addResourceBundle('en', 'translation', {'retry.after_one': template}, true, true);
  expect(text.retryAfterSeconds(1)).toBe('Try again after 1 second.');
  expect(
    createI18nextTranslator({catalog: {'retry.after_one': template}}).retryAfterSeconds(1),
  ).toBe('Try again after 1 second.');
});

test('WEA-28 S05 unsupported nesting cannot expose an arbitrary raw identifier', () => {
  const engine = createInstance();
  const text = createI18nextTranslator({createEngine: () => engine});

  engine.addResource('en', 'translation', 'login.submit', '$t(unknown.translation)');
  expect(text.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  expect(
    createI18nextTranslator({catalog: {'login.submit': '$t(unknown.translation)'}}).text(
      MESSAGE.LOGIN_SUBMIT,
    ),
  ).toBe('Log in');
});

test.each([
  [1, 'retry.after_one', 'Try again after {{count}} seconds.', 'Try again after 1 second.'],
  [2, 'retry.after_other', 'Try again after {{count}} second.', 'Try again after 2 seconds.'],
])(
  'WEA-28 S04 retains English grammar after resource corruption for %p',
  (count, id, template, expected) => {
    const engine = createInstance();
    const text = createI18nextTranslator({createEngine: () => engine});

    engine.addResourceBundle('en', 'translation', {[String(id)]: template}, true, true);
    expect(text.retryAfterSeconds(count)).toBe(expected);
  },
);
