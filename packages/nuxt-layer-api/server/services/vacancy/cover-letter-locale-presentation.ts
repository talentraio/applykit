import type { CoverLetterLanguage, CoverLetterMarket, CoverLetterTone } from '@int/schema';
import type { Locale } from 'date-fns';
import { COVER_LETTER_TONE_MAP } from '@int/schema';
import { format } from 'date-fns';
import { da, enUS, uk } from 'date-fns/locale';
import { getCoverLetterMarketPack } from '../llm/prompts/cover-letter/market-packs';

type CoverLetterLanguagePresentationConfig = {
  dateLocale: Locale;
  letter: {
    closingByTone: Record<CoverLetterTone, string>;
  };
};

const EN_CLOSING_BY_TONE = {
  [COVER_LETTER_TONE_MAP.PROFESSIONAL]: 'Sincerely,',
  [COVER_LETTER_TONE_MAP.FRIENDLY]: 'Best regards,',
  [COVER_LETTER_TONE_MAP.ENTHUSIASTIC]: 'Best,',
  [COVER_LETTER_TONE_MAP.DIRECT]: 'Regards,'
} as const satisfies Record<CoverLetterTone, string>;

const DA_DK_CLOSING_BY_TONE = {
  [COVER_LETTER_TONE_MAP.PROFESSIONAL]: 'Med venlig hilsen',
  [COVER_LETTER_TONE_MAP.FRIENDLY]: 'Venlig hilsen',
  [COVER_LETTER_TONE_MAP.ENTHUSIASTIC]: 'Venlig hilsen',
  [COVER_LETTER_TONE_MAP.DIRECT]: 'Hilsen'
} as const satisfies Record<CoverLetterTone, string>;

const UK_UA_CLOSING_BY_TONE = {
  [COVER_LETTER_TONE_MAP.PROFESSIONAL]: 'З повагою',
  [COVER_LETTER_TONE_MAP.FRIENDLY]: 'З повагою',
  [COVER_LETTER_TONE_MAP.ENTHUSIASTIC]: 'З найкращими побажаннями',
  [COVER_LETTER_TONE_MAP.DIRECT]: 'З повагою'
} as const satisfies Record<CoverLetterTone, string>;

export const COVER_LETTER_LANGUAGE_PRESENTATION_CONFIG_MAP = {
  en: {
    dateLocale: enUS,
    letter: {
      closingByTone: EN_CLOSING_BY_TONE
    }
  },
  'da-DK': {
    dateLocale: da,
    letter: {
      closingByTone: DA_DK_CLOSING_BY_TONE
    }
  },
  'uk-UA': {
    dateLocale: uk,
    letter: {
      closingByTone: UK_UA_CLOSING_BY_TONE
    }
  }
} as const satisfies Record<CoverLetterLanguage, CoverLetterLanguagePresentationConfig>;

export const formatCoverLetterCurrentDate = (
  language: CoverLetterLanguage,
  market: CoverLetterMarket,
  now: Date = new Date()
): string => {
  const languageConfig = COVER_LETTER_LANGUAGE_PRESENTATION_CONFIG_MAP[language];
  const marketConfig = getCoverLetterMarketPack(market);
  return format(now, marketConfig.presentation.datePattern, { locale: languageConfig.dateLocale });
};

export const getCoverLetterLetterClosing = (
  language: CoverLetterLanguage,
  tone: CoverLetterTone
): string => {
  return COVER_LETTER_LANGUAGE_PRESENTATION_CONFIG_MAP[language].letter.closingByTone[tone];
};
