import type { CoverLetterLanguagePack } from './types';
import { localeRequiresGrammaticalGender } from '@int/schema';
import { COVER_LETTER_PROMPT_LOCALE_MAP } from './types';

export const CoverLetterLanguagePackEn: CoverLetterLanguagePack = {
  locale: COVER_LETTER_PROMPT_LOCALE_MAP.EN,
  label: 'English',
  requiresGrammaticalGender: localeRequiresGrammaticalGender(COVER_LETTER_PROMPT_LOCALE_MAP.EN),
  prompt: {
    letter: {
      guidance: [
        'Use a business-like one-page cover letter shape with clear paragraph flow.',
        'Personalize to vacancy needs; do not restate the resume line by line.',
        'Focus on role fit with concrete evidence rather than generic self-descriptions.'
      ],
      greetings: ['Dear {HiringManagerName},', 'Dear Hiring Manager,', 'Hello {FirstName},'],
      closings: ['Sincerely,', 'Best regards,', 'Kind regards,', 'Best,']
    },
    message: {
      guidance: [
        'Keep it skimmable and direct: role + fit + one strong proof + concise CTA.',
        'Use short lines suitable for ATS or application text areas.',
        'Avoid formal letter ceremony when output type is message.'
      ],
      greetings: ['Hi {FirstName},', 'Hello {FirstName},', 'Hi,', 'Hello,'],
      closings: ['Best,', 'Thanks,', 'Kind regards,']
    },
    toneMap: {
      professional: {
        lexicalStyle: 'Neutral business vocabulary; concrete verbs; minimal adjectives.',
        sentenceLength: 'Medium-short with one idea per sentence.',
        tooMuchSignals: [
          'multiple exclamation marks',
          'superlatives without evidence',
          'buzzword-heavy phrases'
        ]
      },
      friendly: {
        lexicalStyle: 'Warm but workplace-safe wording with light personal touch.',
        sentenceLength: 'Short and conversational, especially for message format.',
        tooMuchSignals: ['over-familiar openings', 'emojis', 'jokes that can misfire']
      },
      enthusiastic: {
        lexicalStyle: 'Positive framing anchored in specific role/company context.',
        sentenceLength: 'Short opener plus evidence in compact follow-up lines.',
        tooMuchSignals: [
          'caps lock emphasis',
          'repeating excited/thrilled wording',
          'multiple exclamation marks'
        ]
      },
      direct: {
        lexicalStyle: 'Straight role-fit-proof framing with concise statements.',
        sentenceLength: 'Very short and highly scannable.',
        tooMuchSignals: ['demanding phrasing', 'zero politeness markers']
      }
    },
    lengthGuidelines: {
      letter: {
        short: { minWords: 180, maxWords: 260 },
        standard: { minWords: 260, maxWords: 400 },
        long: { minWords: 400, maxWords: 550 }
      },
      message: {
        short: { minChars: 350, maxChars: 700 },
        standard: { minChars: 700, maxChars: 1200 },
        long: { minChars: 1200, maxChars: 2000 }
      },
      atsFieldStrategy: {
        hardBucketsMaxChars: [300, 500, 1000, 2000],
        compressionOrder: [
          'remove secondary details',
          'keep one proof point',
          'keep CTA',
          'keep role line'
        ]
      }
    },
    naturalnessRules: [
      'Do not use generic openers like "I hope this message finds you well".',
      'Prefer concrete evidence (scope, tools, outcomes) over vague soft-skill claims.',
      'Avoid repetitive transition words and repetitive sentence templates.',
      'Avoid emojis and repeated punctuation in professional hiring contexts.'
    ]
  },
  validation: {
    greetingPatterns: [/^\s*dear\b/i, /^\s*hello\b/i, /^\s*hi\b/i],
    formalClosingPatterns: [
      /\bbest regards\b/i,
      /\bkind regards\b/i,
      /\bregards\b/i,
      /\bsincerely\b/i,
      /\byours faithfully\b/i,
      /\byours sincerely\b/i
    ],
    rules: [
      {
        id: 'en_prohibited_finds_you_well',
        description: 'Avoid templated opener "I hope this message finds you well".',
        pattern: /\bi hope (this|you) (email|message) finds you well\b/i,
        falsePositiveRisk: 'low'
      },
      {
        id: 'en_prohibited_to_whom_it_may_concern',
        description: 'Avoid generic salutation "To whom it may concern".',
        pattern: /^to whom it may concern\b/im,
        falsePositiveRisk: 'low'
      },
      {
        id: 'en_prohibited_dear_sir_madam',
        description: 'Avoid dated salutation "Dear Sir/Madam".',
        pattern: /\bdear sir\/madam\b/i,
        falsePositiveRisk: 'low'
      },
      {
        id: 'en_multiple_exclamations',
        description: 'Avoid multiple exclamation marks.',
        pattern: /!{2,}/,
        falsePositiveRisk: 'low'
      },
      {
        id: 'en_emoji_usage',
        description: 'Avoid emoji usage in professional output.',
        pattern: /\p{Extended_Pictographic}/u,
        falsePositiveRisk: 'medium'
      }
    ]
  }
};
