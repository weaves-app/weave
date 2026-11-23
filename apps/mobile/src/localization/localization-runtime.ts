import type {TextTranslator} from './application/text-translator';
import type {DeviceLocaleSource} from './application/device-locale-source';
import {createI18nextTranslator} from './infrastructure/i18next-translator';
import {createRuntimeLocaleSource} from './infrastructure/runtime-locale-source';

export interface LocalizationRuntime {
  readonly translator: TextTranslator;
  sampleLocale(): void;
}

export interface LocalizationFactory {
  (): LocalizationRuntime;
}

export interface LocalizationOptions {
  readonly translator?: TextTranslator;
  readonly localeSource?: DeviceLocaleSource;
}

export function createLocalizationRuntime(options: LocalizationOptions = {}): LocalizationRuntime {
  const translator = options.translator ?? createI18nextTranslator();
  const localeSource = options.localeSource ?? createRuntimeLocaleSource();

  function sampleLocale(): void {
    try {
      // English is the sole supported result; opaque device input grants no auth authority.
      localeSource.read();
    } catch {
      // A locale capability failure cannot prevent bundled English.
    }
  }

  sampleLocale();

  return Object.freeze({translator, sampleLocale});
}
