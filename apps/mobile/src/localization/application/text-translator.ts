import type {StaticMessageId} from '../messages';

export const LANGUAGE = {ENGLISH: 'en'} as const;

export interface TextTranslator {
  readonly language: typeof LANGUAGE.ENGLISH;
  text(id: StaticMessageId): string;
  retryAfterSeconds(count: unknown): string;
}
