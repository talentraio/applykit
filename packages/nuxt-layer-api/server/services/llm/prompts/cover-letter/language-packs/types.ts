import type { CoverLetterTone } from '@int/schema';

export const COVER_LETTER_PROMPT_LOCALE_MAP = {
  EN: 'en',
  DA_DK: 'da-DK',
  UK_UA: 'uk-UA'
} as const;

export type CoverLetterPromptLocale =
  (typeof COVER_LETTER_PROMPT_LOCALE_MAP)[keyof typeof COVER_LETTER_PROMPT_LOCALE_MAP];

type CoverLetterTonePack = {
  lexicalStyle: string;
  sentenceLength: string;
  tooMuchSignals: readonly string[];
};

type CoverLetterLetterLengthGuideline = {
  minWords: number;
  maxWords: number;
};

type CoverLetterMessageLengthGuideline = {
  minChars: number;
  maxChars: number;
};

type CoverLetterTypePromptPack = {
  guidance: readonly string[];
  greetings: readonly string[];
  closings: readonly string[];
};

type CoverLetterValidationRule = {
  id: string;
  description: string;
  pattern: RegExp;
  falsePositiveRisk: 'low' | 'medium' | 'high';
};

export type CoverLetterLanguagePack = {
  locale: CoverLetterPromptLocale;
  label: string;
  requiresGrammaticalGender: boolean;
  prompt: {
    letter: CoverLetterTypePromptPack;
    message: CoverLetterTypePromptPack;
    toneMap: Record<CoverLetterTone, CoverLetterTonePack>;
    lengthGuidelines: {
      letter: {
        short: CoverLetterLetterLengthGuideline;
        standard: CoverLetterLetterLengthGuideline;
        long: CoverLetterLetterLengthGuideline;
      };
      message: {
        short: CoverLetterMessageLengthGuideline;
        standard: CoverLetterMessageLengthGuideline;
        long: CoverLetterMessageLengthGuideline;
      };
      atsFieldStrategy: {
        hardBucketsMaxChars: readonly number[];
        compressionOrder: readonly string[];
      };
    };
    naturalnessRules: readonly string[];
  };
  validation: {
    greetingPatterns: readonly RegExp[];
    formalClosingPatterns: readonly RegExp[];
    rules: readonly CoverLetterValidationRule[];
  };
};
