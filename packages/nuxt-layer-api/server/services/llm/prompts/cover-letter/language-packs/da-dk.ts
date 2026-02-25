import type { CoverLetterLanguagePack } from './types';
import { localeRequiresGrammaticalGender } from '@int/schema';
import { COVER_LETTER_PROMPT_LOCALE_MAP } from './types';

export const CoverLetterLanguagePackDaDk: CoverLetterLanguagePack = {
  locale: COVER_LETTER_PROMPT_LOCALE_MAP.DA_DK,
  label: 'Danish',
  requiresGrammaticalGender: localeRequiresGrammaticalGender(COVER_LETTER_PROMPT_LOCALE_MAP.DA_DK),
  prompt: {
    letter: {
      guidance: [
        'Use concise, skimmable Danish with clear sections and practical phrasing.',
        'Prefer specific evidence and direct language over generic motivational phrasing.'
      ],
      greetings: ['Hej {FirstName}', 'Hej', 'Kære {FirstName}'],
      closings: ['Med venlig hilsen', 'Venlig hilsen', 'Hilsen']
    },
    message: {
      guidance: [
        'Keep short ATS-friendly Danish: role + concrete match + one measurable proof.',
        'Use compact lines and avoid long academic sentence structure.',
        'Avoid exaggerated hype and heavy flattery.'
      ],
      greetings: ['Hej {FirstName}', 'Hej', 'Kære {FirstName}'],
      closings: ['Venlig hilsen', 'Med venlig hilsen']
    },
    toneMap: {
      professional: {
        lexicalStyle: 'Konkrete verber, få adjektiver, tydeligt fokus på opgaver og bidrag.',
        sentenceLength: 'Kort til medium med høj skimmebarhed.',
        tooMuchSignals: [
          'overdreven ros uden evidens',
          'buzzword-sprog',
          'lange akademiske sætninger'
        ]
      },
      friendly: {
        lexicalStyle: 'Varmt men professionelt sprog med let personlighed.',
        sentenceLength: 'Korte sætninger i naturlig rytme.',
        tooMuchSignals: ['for intime sluthilsner', 'emojis', 'for privat indhold']
      },
      enthusiastic: {
        lexicalStyle: 'Motivation via konkrete grunde knyttet til virksomhed/rolle.',
        sentenceLength: 'Kort og evidensdrevet.',
        tooMuchSignals: ['superlativer', 'mange udråbstegn', 'drømmejob-retorik']
      },
      direct: {
        lexicalStyle: 'Kort hvorfor-mig + bevis; evt. korte bullets i beskeder.',
        sentenceLength: 'Meget korte og scannable sætninger.',
        tooMuchSignals: ['lyder som krav', 'ingen høflighedsmarkører']
      }
    },
    lengthGuidelines: {
      letter: {
        short: { minWords: 150, maxWords: 230 },
        standard: { minWords: 230, maxWords: 330 },
        long: { minWords: 330, maxWords: 450 }
      },
      message: {
        short: { minChars: 300, maxChars: 650 },
        standard: { minChars: 650, maxChars: 1100 },
        long: { minChars: 1100, maxChars: 1800 }
      },
      atsFieldStrategy: {
        hardBucketsMaxChars: [300, 500, 1000, 2000],
        compressionOrder: [
          'fjern sekundære detaljer',
          'behold ét bevis',
          'behold CTA',
          'behold rollelinje'
        ]
      }
    },
    naturalnessRules: [
      'Undgå komma efter starthilsen og sluthilsen i dansk.',
      'Brug kun "Kære" sammen med navn; ellers brug "Hej".',
      'Foretræk "Venlig hilsen" eller "Med venlig hilsen" i professionel kontekst.',
      'Forklar motivation konkret med virksomhedsspecifik begrundelse.'
    ]
  },
  validation: {
    greetingPatterns: [/^\s*kære\b/i, /^\s*hej\b/i],
    formalClosingPatterns: [/\bvenlig hilsen\b/i, /\bmed venlig hilsen\b/i, /\bhilsen\b/i],
    rules: [
      {
        id: 'da_comma_after_greeting',
        description: 'Avoid comma after Danish greeting line.',
        pattern: /^(Hej|Kære)\b.*,$/im,
        falsePositiveRisk: 'low'
      },
      {
        id: 'da_comma_after_closing',
        description: 'Avoid comma after Danish closing line.',
        pattern: /^(Med venlig hilsen|Venlig hilsen|Hilsen),$/im,
        falsePositiveRisk: 'low'
      },
      {
        id: 'da_kaere_without_name',
        description: '"Kære" should be followed by a name.',
        pattern: /^Kære\s*$/im,
        falsePositiveRisk: 'low'
      },
      {
        id: 'da_calque_closing',
        description: 'Avoid "de bedste hilsner" in professional hiring output.',
        pattern: /\bde bedste hilsner\b/i,
        falsePositiveRisk: 'medium'
      },
      {
        id: 'da_multiple_exclamations',
        description: 'Avoid multiple exclamation marks.',
        pattern: /!{2,}/,
        falsePositiveRisk: 'low'
      },
      {
        id: 'da_emoji_usage',
        description: 'Avoid emoji usage in professional output.',
        pattern: /\p{Extended_Pictographic}/u,
        falsePositiveRisk: 'medium'
      }
    ]
  }
};
