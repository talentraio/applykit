import type { LLMProvider } from '@int/schema';
import { LLM_PROVIDER_MAP, LLM_PROVIDER_VALUES } from '@int/schema';

type RuntimeConfigLike = {
  llm?: {
    coverLetterHumanizer?: {
      mode?: unknown;
      criticProvider?: unknown;
      criticModel?: unknown;
      minNaturalnessScore?: unknown;
      maxAiRiskScore?: unknown;
      maxRewritePasses?: unknown;
      debugLogs?: unknown;
    };
  };
};

export type CoverLetterHumanizerMode = 'off' | 'score' | 'rewrite';

export type CoverLetterHumanizerConfig = {
  mode: CoverLetterHumanizerMode;
  criticProvider: LLMProvider;
  criticModel: string;
  minNaturalnessScore: number;
  maxAiRiskScore: number;
  maxRewritePasses: number;
  debugLogs: boolean;
};

const COVER_LETTER_HUMANIZER_DEFAULTS: CoverLetterHumanizerConfig = {
  mode: 'off',
  criticProvider: LLM_PROVIDER_MAP.OPENAI,
  criticModel: 'gpt-5-mini',
  minNaturalnessScore: 75,
  maxAiRiskScore: 35,
  maxRewritePasses: 1,
  debugLogs: true
};

const toMode = (value: unknown): CoverLetterHumanizerMode => {
  if (value === 'off' || value === 'score' || value === 'rewrite') {
    return value;
  }

  return COVER_LETTER_HUMANIZER_DEFAULTS.mode;
};

const toProvider = (value: unknown): LLMProvider => {
  return typeof value === 'string' && LLM_PROVIDER_VALUES.includes(value as LLMProvider)
    ? (value as LLMProvider)
    : COVER_LETTER_HUMANIZER_DEFAULTS.criticProvider;
};

const toStringValue = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const toIntInRange = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
};

export const resolveCoverLetterHumanizerConfig = (
  runtimeConfig: RuntimeConfigLike
): CoverLetterHumanizerConfig => {
  const config = runtimeConfig.llm?.coverLetterHumanizer;

  return {
    mode: toMode(config?.mode),
    criticProvider: toProvider(config?.criticProvider),
    criticModel: toStringValue(config?.criticModel, COVER_LETTER_HUMANIZER_DEFAULTS.criticModel),
    minNaturalnessScore: toIntInRange(
      config?.minNaturalnessScore,
      0,
      100,
      COVER_LETTER_HUMANIZER_DEFAULTS.minNaturalnessScore
    ),
    maxAiRiskScore: toIntInRange(
      config?.maxAiRiskScore,
      0,
      100,
      COVER_LETTER_HUMANIZER_DEFAULTS.maxAiRiskScore
    ),
    maxRewritePasses: toIntInRange(
      config?.maxRewritePasses,
      0,
      3,
      COVER_LETTER_HUMANIZER_DEFAULTS.maxRewritePasses
    ),
    debugLogs: toBoolean(config?.debugLogs, COVER_LETTER_HUMANIZER_DEFAULTS.debugLogs)
  };
};
