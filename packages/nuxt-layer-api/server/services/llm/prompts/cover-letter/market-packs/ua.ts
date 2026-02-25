import type { CoverLetterMarketPack } from './types';
import { COVER_LETTER_PROMPT_MARKET_MAP } from './types';

export const CoverLetterMarketPackUa: CoverLetterMarketPack = {
  market: COVER_LETTER_PROMPT_MARKET_MAP.UA,
  label: 'Ukraine',
  prompt: {
    letter: {
      guidance: [
        'Keep respectful business correspondence style with clear intent.',
        'Focus on practical contribution and fit, not resume retelling.',
        'Avoid bureaucratic phrasing and generic soft-skill lists.'
      ]
    },
    message: {
      guidance: [
        'Write short polite message for form/email context.',
        'Include one concrete proof point and a concise CTA.',
        'Avoid excessive emotional punctuation and vague claims.'
      ]
    },
    naturalnessRules: [
      'Avoid Russianisms and translated bureaucratic templates.',
      'Prefer direct factual wording with natural sentence flow.',
      'If unsure about name inflection, keep greeting safely neutral.'
    ]
  },
  presentation: {
    datePattern: 'd MMMM yyyy р.'
  }
};
