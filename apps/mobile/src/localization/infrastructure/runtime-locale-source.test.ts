import {createRuntimeLocaleSource} from './runtime-locale-source';

test.each(['en', 'en-GB', 'en-IN', 'fr-FR', '', undefined, [], {}].map((locale) => [locale]))(
  'WEA-28 S02 samples opaque locale %p',
  (locale) => {
    expect(createRuntimeLocaleSource(() => locale).read()).toBe(locale);
  },
);

test('WEA-28 S02 catches a throwing locale source', () => {
  expect(
    createRuntimeLocaleSource(() => {
      throw new Error('locale unavailable');
    }).read(),
  ).toBeUndefined();
});

test('WEA-28 S02 guards absent Intl', () => {
  const saved = global.Intl;

  Object.defineProperty(global, 'Intl', {value: undefined, configurable: true});

  try {
    expect(createRuntimeLocaleSource().read()).toBeUndefined();
  } finally {
    Object.defineProperty(global, 'Intl', {value: saved, configurable: true});
  }
});
