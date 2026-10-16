import {createLocalizationRuntime} from './localization-runtime';
import {createI18nextTranslator} from './infrastructure/i18next-translator';
import {MESSAGE} from './messages';
import {englishCatalog} from './resources/en';

test.each(['en', 'en-GB', 'en-IN', 'fr-FR', undefined, [], {}].map((locale) => [locale]))(
  'WEA-28 S02 initializes usable English for %p and resamples without replacing translator',
  (locale) => {
    const read = jest.fn(() => locale);
    const runtime = createLocalizationRuntime({localeSource: {read}});
    const text = runtime.translator;

    expect(read).toHaveBeenCalledTimes(1);
    expect(text.language).toBe('en');
    runtime.sampleLocale();
    expect(read).toHaveBeenCalledTimes(2);
    expect(runtime.translator).toBe(text);
    expect(text.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
  },
);

test('WEA-28 S02 throwing injected locale never prevents synchronous English', () => {
  const runtime = createLocalizationRuntime({
    localeSource: {
      read: () => {
        throw new Error('native locale');
      },
    },
  });

  expect(() => runtime.sampleLocale()).not.toThrow();
  expect(runtime.translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
});

test('WEA-28 S07 independent runtime translator injection stays scoped', () => {
  const scoped = createI18nextTranslator({
    catalog: {...englishCatalog, 'login.submit': 'Enter first workspace'},
  });
  const first = createLocalizationRuntime({translator: scoped});
  const second = createLocalizationRuntime();

  expect(first.translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Enter first workspace');
  expect(second.translator.text(MESSAGE.LOGIN_SUBMIT)).toBe('Log in');
});
