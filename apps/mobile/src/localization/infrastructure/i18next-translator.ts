import {createInstance} from 'i18next';
import type {i18n} from 'i18next';

import type {TextTranslator} from '../application/text-translator';
import {createSafeEnglishTranslator, isRetryCount} from '../safe-english';
import {LANGUAGE} from '../application/text-translator';
import {
  isDisplayText,
  isRetryDisplay,
  readCatalogEntry,
  requiredMessageIds,
  validateEnglishCatalog,
} from '../messages';
import type {StaticMessageId} from '../messages';
import {englishCatalog} from '../resources/en';

export interface EngineFactory {
  (): i18n;
}

export interface I18nextTranslatorOptions {
  readonly catalog?: unknown;
  readonly createEngine?: EngineFactory;
}

export const RETRY_MESSAGE_KEY = 'retry.after';

export const TRANSLATION_NAMESPACE = 'translation';

export function createI18nextTranslator(options: I18nextTranslatorOptions = {}): TextTranslator {
  const safe = createSafeEnglishTranslator();

  try {
    const engine = (options.createEngine ?? createInstance)();
    const entries: Record<string, string> = {};
    const catalog = options.catalog === undefined ? englishCatalog : options.catalog;

    const invalid = new Set(validateEnglishCatalog(catalog));

    for (const id of requiredMessageIds) {
      const value = readCatalogEntry(catalog, id);

      if (typeof value === 'string' && !invalid.has(id)) entries[id] = value;
    }

    void engine
      .init({
        lng: LANGUAGE.ENGLISH,
        fallbackLng: LANGUAGE.ENGLISH,
        supportedLngs: [LANGUAGE.ENGLISH],
        ns: [TRANSLATION_NAMESPACE],
        defaultNS: TRANSLATION_NAMESPACE,
        keySeparator: false,
        nsSeparator: false,
        initAsync: false,
        partialBundledLanguages: false,
        returnEmptyString: false,
        returnNull: false,
        debug: false,
        saveMissing: false,
        interpolation: {escapeValue: false},
        resources: {[LANGUAGE.ENGLISH]: {[TRANSLATION_NAMESPACE]: entries}},
      })
      .catch(() => undefined);

    if (!engine.isInitialized) return safe;

    return Object.freeze({
      language: LANGUAGE.ENGLISH,

      text: (id: StaticMessageId): string => {
        try {
          const result: unknown = engine.t(id, {
            defaultValue: safe.text(id),
            returnObjects: true,
            nest: false,
          });

          return isDisplayText(result) ? result : safe.text(id);
        } catch {
          return safe.text(id);
        }
      },

      retryAfterSeconds: (count: unknown): string => {
        const fallback = safe.retryAfterSeconds(count);

        if (!isRetryCount(count)) return fallback;

        try {
          const result: unknown = engine.t(RETRY_MESSAGE_KEY, {
            count,
            defaultValue: fallback,
            returnObjects: true,
            nest: false,
          });

          return isRetryDisplay(result, count) ? result : fallback;
        } catch {
          return fallback;
        }
      },
    });
  } catch {
    return safe;
  }
}
