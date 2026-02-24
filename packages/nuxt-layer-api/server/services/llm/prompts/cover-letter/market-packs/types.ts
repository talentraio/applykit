import type { CoverLetterMarket } from '@int/schema';

export const COVER_LETTER_PROMPT_MARKET_MAP = {
  DEFAULT: 'default',
  DK: 'dk',
  UA: 'ua'
} as const;

export type CoverLetterPromptMarket =
  (typeof COVER_LETTER_PROMPT_MARKET_MAP)[keyof typeof COVER_LETTER_PROMPT_MARKET_MAP];

export type CoverLetterMarketPack = {
  market: CoverLetterPromptMarket;
  label: string;
  prompt: {
    letter: {
      guidance: readonly string[];
    };
    message: {
      guidance: readonly string[];
    };
    naturalnessRules: readonly string[];
  };
  presentation: {
    datePattern: string;
  };
};

export type ActiveCoverLetterMarketPacks = Record<CoverLetterMarket, CoverLetterMarketPack>;
