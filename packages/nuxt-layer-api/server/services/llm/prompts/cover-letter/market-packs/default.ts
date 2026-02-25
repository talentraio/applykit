import type { CoverLetterMarketPack } from './types';
import { COVER_LETTER_PROMPT_MARKET_MAP } from './types';

export const CoverLetterMarketPackDefault: CoverLetterMarketPack = {
  market: COVER_LETTER_PROMPT_MARKET_MAP.DEFAULT,
  label: 'General',
  prompt: {
    letter: {
      guidance: [
        'Keep formal business-letter clarity with 3-4 focused paragraphs.',
        'Prioritize relevance to vacancy needs over broad personal narrative.',
        'Keep claims factual, specific, and easy to verify.'
      ]
    },
    message: {
      guidance: [
        'Write concise, application-form friendly text.',
        'Lead with role fit and one concrete proof point.',
        'Close with a short, polite call to action.'
      ]
    },
    naturalnessRules: [
      'Avoid generic boilerplate and empty superlatives.',
      'Prefer concrete outcomes and measurable evidence.',
      'Avoid repetitive transitions and templated rhythm.'
    ]
  },
  presentation: {
    datePattern: 'd MMMM yyyy'
  }
};
