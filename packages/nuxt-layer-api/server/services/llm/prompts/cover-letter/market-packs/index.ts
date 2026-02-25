import type { CoverLetterMarket } from '@int/schema';
import type { CoverLetterMarketPack, CoverLetterPromptMarket } from './types';
import { CoverLetterMarketPackDefault } from './default';
import { CoverLetterMarketPackDk } from './dk';
import { CoverLetterMarketPackUa } from './ua';

const COVER_LETTER_PROMPT_PACKS_BY_MARKET: Record<CoverLetterPromptMarket, CoverLetterMarketPack> =
  {
    default: CoverLetterMarketPackDefault,
    dk: CoverLetterMarketPackDk,
    ua: CoverLetterMarketPackUa
  };

export const COVER_LETTER_ACTIVE_MARKET_PACKS = {
  default: CoverLetterMarketPackDefault,
  dk: CoverLetterMarketPackDk,
  ua: CoverLetterMarketPackUa
} as const satisfies Record<CoverLetterMarket, CoverLetterMarketPack>;

export const getCoverLetterMarketPack = (market: CoverLetterMarket): CoverLetterMarketPack => {
  return COVER_LETTER_ACTIVE_MARKET_PACKS[market];
};

export const getCoverLetterMarketPackByCode = (
  market: CoverLetterPromptMarket
): CoverLetterMarketPack => {
  return COVER_LETTER_PROMPT_PACKS_BY_MARKET[market];
};

export const COVER_LETTER_PROMPT_MARKETS: readonly CoverLetterPromptMarket[] = [
  'default',
  'dk',
  'ua'
];

export type { CoverLetterMarketPack, CoverLetterPromptMarket } from './types';
export { COVER_LETTER_PROMPT_MARKET_MAP } from './types';
