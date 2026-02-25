import type { CoverLetterMarketPack } from './types';
import { COVER_LETTER_PROMPT_MARKET_MAP } from './types';

export const CoverLetterMarketPackDk: CoverLetterMarketPack = {
  market: COVER_LETTER_PROMPT_MARKET_MAP.DK,
  label: 'Denmark',
  prompt: {
    letter: {
      guidance: [
        'Write concise and skimmable text with practical contribution focus.',
        'Emphasize what value candidate brings to employer problems.',
        'Avoid heavy formality, exaggerated praise, and abstract motivation.'
      ]
    },
    message: {
      guidance: [
        'Keep compact direct message suitable for ATS or email body.',
        'Use concrete fit statements and one tangible proof.',
        'Avoid long paragraphs and over-polished marketing tone.'
      ]
    },
    naturalnessRules: [
      'Prefer straightforward wording over American-style hype.',
      'Keep motivation specific to role/team context.',
      'Avoid overclaiming without evidence.'
    ]
  },
  presentation: {
    datePattern: 'd MMMM yyyy'
  }
};
