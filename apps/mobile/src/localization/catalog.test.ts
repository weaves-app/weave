import {englishCatalog} from './resources/en';
import {MESSAGE, validateEnglishCatalog} from './messages';
import {completeEnglishFixture} from './testing/english-fixture';

test('WEA-28 S05 rejects deletion of every independently required message', () => {
  expect(validateEnglishCatalog(completeEnglishFixture)).toEqual([]);

  for (const id of Object.values(MESSAGE)) {
    const candidate: Record<string, unknown> = {...completeEnglishFixture};

    delete candidate[id];
    expect(validateEnglishCatalog(candidate)).toContain(id);
  }
});

test.each([undefined, null, [], '', 0])(
  'WEA-28 S05 rejects unavailable catalog %p',
  (candidate) => {
    expect(validateEnglishCatalog(candidate)).toHaveLength(51);
  },
);

test.each(['', '  ', {}, '{{email}}', 'Try {{count}} {{count}}', 'No count here'])(
  'WEA-28 S05 rejects invalid resource %p',
  (value) => {
    expect(validateEnglishCatalog({...completeEnglishFixture, 'retry.after_one': value})).toContain(
      'retry.after_one',
    );
  },
);

test('WEA-28 S05 rejects static markers, object values and throwing resource access', () => {
  expect(
    validateEnglishCatalog({...completeEnglishFixture, 'login.submit': '{{count}}'}),
  ).toContain('login.submit');
  expect(
    validateEnglishCatalog({...completeEnglishFixture, 'login.submit': {text: 'Log in'}}),
  ).toContain('login.submit');

  const candidate = {...completeEnglishFixture};

  Object.defineProperty(candidate, 'login.submit', {
    get: () => {
      throw new Error('resource fault');
    },
  });
  expect(validateEnglishCatalog(candidate)).toContain('login.submit');
});

test('WEA-28 S05 shipped catalog passes the independent delivery contract and approved wording', () => {
  expect(validateEnglishCatalog(englishCatalog)).toEqual([]);
  expect(englishCatalog).toEqual(completeEnglishFixture);
});

test.each([
  '$t(unknown.translation)',
  'Try again after {{count}}0 seconds.',
  'Try again after -{{count}} seconds.',
])('WEA-28 S05 rejects unsupported formatting %p', (value) => {
  const id = value.startsWith('$t(') ? MESSAGE.LOGIN_SUBMIT : MESSAGE.RETRY_AFTER_ONE;

  expect(validateEnglishCatalog({...completeEnglishFixture, [id]: value})).toContain(id);
});
