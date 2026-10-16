import {createSafeEnglishTranslator} from './safe-english';
import {createI18nextTranslator} from './infrastructure/i18next-translator';

test.each([
  [0, 'Try again after 0 seconds.'],
  [1, 'Try again after 1 second.'],
  [2, 'Try again after 2 seconds.'],
  [60, 'Try again after 60 seconds.'],
])('WEA-28 S04 real engine and pure fallback format %p correctly', (count, expected) => {
  expect(createI18nextTranslator().retryAfterSeconds(count)).toBe(expected);
  expect(createSafeEnglishTranslator().retryAfterSeconds(count)).toBe(expected);
});

test.each(
  [undefined, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', {}].map((value) => [value]),
)('WEA-28 S04/S05 invalid count %p stays safe', (count) => {
  expect(createI18nextTranslator().retryAfterSeconds(count)).toBe(
    'Please wait before trying again.',
  );
  expect(createSafeEnglishTranslator().retryAfterSeconds(count)).toBe(
    'Please wait before trying again.',
  );
});
