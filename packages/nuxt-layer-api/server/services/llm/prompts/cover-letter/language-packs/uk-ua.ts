import type { CoverLetterLanguagePack } from './types';
import { localeRequiresGrammaticalGender } from '@int/schema';
import { COVER_LETTER_PROMPT_LOCALE_MAP } from './types';

export const CoverLetterLanguagePackUkUa: CoverLetterLanguagePack = {
  locale: COVER_LETTER_PROMPT_LOCALE_MAP.UK_UA,
  label: 'Ukrainian',
  requiresGrammaticalGender: localeRequiresGrammaticalGender(COVER_LETTER_PROMPT_LOCALE_MAP.UK_UA),
  prompt: {
    letter: {
      guidance: [
        'Write as modern Ukrainian business correspondence, concise and respectful.',
        'Do not repeat resume; explain fit with concrete evidence.',
        'Prefer safe greeting forms when name inflection is uncertain.'
      ],
      greetings: [
        'Добрий день!',
        'Вітаю!',
        'Шановний пане {LastName}!',
        'Шановна пані {LastName}!'
      ],
      closings: ['З повагою', 'Зі щирою повагою', 'З найкращими побажаннями']
    },
    message: {
      guidance: [
        'Keep concise ATS-form message: role line + one proof + short CTA.',
        'Maintain polite modern Ukrainian without bureaucratic or translated wording.',
        'Do not include a formal contact signature block in message mode.'
      ],
      greetings: [
        'Добрий день!',
        'Вітаю!',
        'Шановна пані {LastName}!',
        'Шановний пане {LastName}!'
      ],
      closings: ['З повагою', 'Дякую!']
    },
    toneMap: {
      professional: {
        lexicalStyle: 'Чітка ділова лексика з фактами, метриками та конкретними дієсловами.',
        sentenceLength: 'Короткі або середні речення з прозорою структурою.',
        tooMuchSignals: ['канцелярит', 'пасивні конструкції без потреби', 'емоційний перегрів']
      },
      friendly: {
        lexicalStyle: 'Теплий, ввічливий тон без сленгу.',
        sentenceLength: 'Короткі речення в природному ритмі.',
        tooMuchSignals: ['емодзі', 'надмірна фамільярність', 'надто особисті деталі']
      },
      enthusiastic: {
        lexicalStyle: 'Мотивація через конкретику про роль, продукт або команду.',
        sentenceLength: 'Короткі доказові речення.',
        tooMuchSignals: ['багато знаків оклику', 'мрія без аргументів', 'порожні суперлативи']
      },
      direct: {
        lexicalStyle: 'Роль + відповідність + доказ у максимально стислому викладі.',
        sentenceLength: 'Дуже короткі скановані рядки.',
        tooMuchSignals: ['ультимативний тон', 'повна відсутність ввічливих формул']
      }
    },
    lengthGuidelines: {
      letter: {
        short: { minWords: 180, maxWords: 280 },
        standard: { minWords: 280, maxWords: 450 },
        long: { minWords: 450, maxWords: 650 }
      },
      message: {
        short: { minChars: 350, maxChars: 700 },
        standard: { minChars: 700, maxChars: 1200 },
        long: { minChars: 1200, maxChars: 2000 }
      },
      atsFieldStrategy: {
        hardBucketsMaxChars: [300, 500, 1000, 2000],
        compressionOrder: [
          'прибрати другорядні деталі',
          'залишити один доказ',
          'залишити CTA',
          'залишити рядок про роль'
        ]
      }
    },
    naturalnessRules: [
      'Уникайте русизмів і російських привітань.',
      'Краще нейтральне "Добрий день!" ніж помилкове відмінювання імені.',
      'Не копіюйте англійську пунктуацію у фінальному підписі.',
      'Замінюйте шаблонні soft skills на конкретні результати.'
    ]
  },
  validation: {
    greetingPatterns: [
      /^\s*добрий день(?:[!.,\s]|$)/iu,
      /^\s*вітаю(?:[!.,\s]|$)/iu,
      /^\s*шановн(?:ий|а)(?:[!.,\s]|$)/iu
    ],
    formalClosingPatterns: [
      /(?:^|\s)з повагою(?:[!.,\s]|$)/iu,
      /(?:^|\s)зі щирою повагою(?:[!.,\s]|$)/iu,
      /(?:^|\s)з найкращими побажаннями(?:[!.,\s]|$)/iu
    ],
    rules: [
      {
        id: 'uk_russian_greeting',
        description: 'Avoid Russian greeting in Ukrainian output.',
        pattern: /здравствуйте/iu,
        falsePositiveRisk: 'low'
      },
      {
        id: 'uk_russianism_ya_yavlyayus',
        description: 'Avoid Russianism "я являюсь".',
        pattern: /я являюсь/iu,
        falsePositiveRisk: 'low'
      },
      {
        id: 'uk_multiple_exclamations',
        description: 'Avoid multiple exclamation marks.',
        pattern: /!{2,}/,
        falsePositiveRisk: 'low'
      },
      {
        id: 'uk_emoji_usage',
        description: 'Avoid emoji usage in professional output.',
        pattern: /\p{Extended_Pictographic}/u,
        falsePositiveRisk: 'medium'
      }
    ]
  }
};
