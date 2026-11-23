import {createLocalizationRuntime} from '../localization-runtime';
import type {LocalizationRuntime} from '../localization-runtime';
import {createI18nextTranslator} from '../infrastructure/i18next-translator';
import {englishCatalog} from '../resources/en';

export function createSentinelLocalization(): LocalizationRuntime {
  return createLocalizationRuntime({
    translator: createI18nextTranslator({
      catalog: Object.fromEntries(
        Object.entries(englishCatalog).map(([id, copy]) => [id, `English fixture: ${copy}`]),
      ),
    }),
  });
}
