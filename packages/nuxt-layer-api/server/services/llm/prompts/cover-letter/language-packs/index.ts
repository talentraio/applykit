import type { CoverLetterLanguage } from '@int/schema';
import type { CoverLetterLanguagePack, CoverLetterPromptLocale } from './types';
import { CoverLetterLanguagePackDaDk } from './da-dk';
import { CoverLetterLanguagePackEn } from './en';
import { CoverLetterLanguagePackUkUa } from './uk-ua';

const COVER_LETTER_PROMPT_PACKS_BY_LOCALE: Record<
  CoverLetterPromptLocale,
  CoverLetterLanguagePack
> = {
  en: CoverLetterLanguagePackEn,
  'da-DK': CoverLetterLanguagePackDaDk,
  'uk-UA': CoverLetterLanguagePackUkUa
};

export const COVER_LETTER_ACTIVE_LANGUAGE_PACKS = {
  en: CoverLetterLanguagePackEn,
  'da-DK': CoverLetterLanguagePackDaDk,
  'uk-UA': CoverLetterLanguagePackUkUa
} as const satisfies Record<CoverLetterLanguage, CoverLetterLanguagePack>;

export const getCoverLetterLanguagePack = (
  language: CoverLetterLanguage
): CoverLetterLanguagePack => {
  return COVER_LETTER_ACTIVE_LANGUAGE_PACKS[language];
};

export const getCoverLetterLanguagePackByLocale = (
  locale: CoverLetterPromptLocale
): CoverLetterLanguagePack => {
  return COVER_LETTER_PROMPT_PACKS_BY_LOCALE[locale];
};

export const COVER_LETTER_PROMPT_LOCALES: readonly CoverLetterPromptLocale[] = [
  'en',
  'da-DK',
  'uk-UA'
];

export type { CoverLetterLanguagePack, CoverLetterPromptLocale } from './types';
export { COVER_LETTER_PROMPT_LOCALE_MAP } from './types';
