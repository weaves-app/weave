import type {DeviceLocaleSource} from '../application/device-locale-source';

export interface LocaleReader {
  (): unknown;
}

function readRuntimeLocale(): unknown {
  return globalThis.Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.locale;
}

export function createRuntimeLocaleSource(
  readLocale: LocaleReader = readRuntimeLocale,
): DeviceLocaleSource {
  return {
    read: (): unknown => {
      try {
        return readLocale();
      } catch {
        return undefined;
      }
    },
  };
}
