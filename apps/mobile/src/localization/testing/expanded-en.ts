import {englishCatalog as canonicalEnglishCatalog} from '../resources/en';
import {MESSAGE} from '../messages';
import type {EnglishCatalog} from '../messages';

export const expandedEnglishCatalog: EnglishCatalog = Object.freeze(
  Object.fromEntries(
    Object.entries(canonicalEnglishCatalog).map(([id, copy]) => [
      id,
      id === MESSAGE.RETRY_AFTER_ONE || id === MESSAGE.RETRY_AFTER_OTHER
        ? `${copy} Please wait before retrying.`
        : `${copy} ${copy}`,
    ]),
  ),
);

// Match the canonical export only in the explicitly selected Metro fixture graph.
export const englishCatalog = expandedEnglishCatalog;
