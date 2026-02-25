type RuntimeConfigLike = {
  llm?: {
    coverLetterHumanizer?: {
      minNaturalnessScore?: unknown;
      maxAiRiskScore?: unknown;
      maxRewritePasses?: unknown;
      debugLogs?: unknown;
    };
  };
};

export type CoverLetterHumanizerRuntimeConfig = {
  minNaturalnessScore: number;
  maxAiRiskScore: number;
  maxRewritePasses: number;
  debugLogs: boolean;
};

const COVER_LETTER_HUMANIZER_DEFAULTS: CoverLetterHumanizerRuntimeConfig = {
  minNaturalnessScore: 75,
  maxAiRiskScore: 35,
  maxRewritePasses: 1,
  debugLogs: true
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
): CoverLetterHumanizerRuntimeConfig => {
  const config = runtimeConfig.llm?.coverLetterHumanizer;

  return {
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
