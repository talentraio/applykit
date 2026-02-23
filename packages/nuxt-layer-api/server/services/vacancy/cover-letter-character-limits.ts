import type { CoverLetterGenerationSettings } from '@int/schema';
import {
  COVER_LETTER_CHARACTER_BUFFER_DEFAULTS,
  COVER_LETTER_CHARACTER_LIMIT_DEFAULTS,
  COVER_LETTER_LENGTH_PRESET_MAP
} from '@int/schema';

type RuntimeConfigLike = {
  public?: {
    coverLetter?: {
      minLengthLimitCharacters?: unknown;
      maxLengthLimitCharacters?: unknown;
      targetBufferRatio?: unknown;
      targetBufferSmallLimitThreshold?: unknown;
      targetBufferSmallMin?: unknown;
      targetBufferSmallMax?: unknown;
      targetBufferMin?: unknown;
      targetBufferMax?: unknown;
    };
  };
};

export type CoverLetterCharacterLimits = {
  min: number;
  max: number;
};

export type CoverLetterCharacterBufferConfig = {
  targetBufferRatio: number;
  targetBufferSmallLimitThreshold: number;
  targetBufferSmallMin: number;
  targetBufferSmallMax: number;
  targetBufferMin: number;
  targetBufferMax: number;
};

export const DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG: CoverLetterCharacterBufferConfig = {
  targetBufferRatio: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_RATIO,
  targetBufferSmallLimitThreshold:
    COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_LIMIT_THRESHOLD,
  targetBufferSmallMin: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_MIN,
  targetBufferSmallMax: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_SMALL_MAX,
  targetBufferMin: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_MIN,
  targetBufferMax: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_MAX
};

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(parsed));
};

const toBufferRatio = (value: unknown, fallback: number): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseFloat(typeof value === 'string' ? value : String(value ?? ''));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  const normalized = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0.001, Math.min(1, normalized));
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const resolveCoverLetterCharacterLimits = (
  runtimeConfig: RuntimeConfigLike
): CoverLetterCharacterLimits => {
  const minConfigured = toPositiveInt(
    runtimeConfig.public?.coverLetter?.minLengthLimitCharacters,
    COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MIN
  );
  const maxConfigured = toPositiveInt(
    runtimeConfig.public?.coverLetter?.maxLengthLimitCharacters,
    COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MAX
  );

  return {
    min: Math.min(minConfigured, maxConfigured),
    max: Math.max(minConfigured, maxConfigured)
  };
};

export const resolveCoverLetterCharacterBufferConfig = (
  runtimeConfig: RuntimeConfigLike
): CoverLetterCharacterBufferConfig => {
  const targetBufferRatio = toBufferRatio(
    runtimeConfig.public?.coverLetter?.targetBufferRatio,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferRatio
  );
  const targetBufferSmallLimitThreshold = toPositiveInt(
    runtimeConfig.public?.coverLetter?.targetBufferSmallLimitThreshold,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferSmallLimitThreshold
  );
  const targetBufferSmallMin = toPositiveInt(
    runtimeConfig.public?.coverLetter?.targetBufferSmallMin,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferSmallMin
  );
  const targetBufferSmallMax = toPositiveInt(
    runtimeConfig.public?.coverLetter?.targetBufferSmallMax,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferSmallMax
  );
  const targetBufferMin = toPositiveInt(
    runtimeConfig.public?.coverLetter?.targetBufferMin,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferMin
  );
  const targetBufferMax = toPositiveInt(
    runtimeConfig.public?.coverLetter?.targetBufferMax,
    DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG.targetBufferMax
  );

  return {
    targetBufferRatio,
    targetBufferSmallLimitThreshold,
    targetBufferSmallMin: Math.min(targetBufferSmallMin, targetBufferSmallMax),
    targetBufferSmallMax: Math.max(targetBufferSmallMin, targetBufferSmallMax),
    targetBufferMin: Math.min(targetBufferMin, targetBufferMax),
    targetBufferMax: Math.max(targetBufferMin, targetBufferMax)
  };
};

const isCharacterLengthPreset = (value: CoverLetterGenerationSettings['lengthPreset']): boolean => {
  return (
    value === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS ||
    value === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
  );
};

export const getCharacterLimitValidationMessage = (
  settings: CoverLetterGenerationSettings,
  limits: CoverLetterCharacterLimits
): string | null => {
  if (settings.type !== 'message' || !isCharacterLengthPreset(settings.lengthPreset)) {
    return null;
  }

  const limitValue = settings.characterLimit;
  if (limitValue === null) {
    return null;
  }

  const label =
    settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS
      ? 'Minimum characters'
      : 'Maximum characters';

  if (limitValue < limits.min) {
    return `${label} must be at least ${limits.min}.`;
  }

  if (limitValue > limits.max) {
    return `${label} must be at most ${limits.max}.`;
  }

  return null;
};

export const createAdaptiveCharacterBuffer = (
  characterLimit: number,
  config: CoverLetterCharacterBufferConfig = DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG
): number => {
  const rawBuffer = Math.round(characterLimit * config.targetBufferRatio);

  if (characterLimit <= config.targetBufferSmallLimitThreshold) {
    return clampNumber(rawBuffer, config.targetBufferSmallMin, config.targetBufferSmallMax);
  }

  return clampNumber(rawBuffer, config.targetBufferMin, config.targetBufferMax);
};

export const createSoftCharacterTarget = (
  settings: CoverLetterGenerationSettings,
  config: CoverLetterCharacterBufferConfig = DEFAULT_COVER_LETTER_CHARACTER_BUFFER_CONFIG
): number | null => {
  if (settings.type !== 'message' || !isCharacterLengthPreset(settings.lengthPreset)) {
    return null;
  }

  if (settings.characterLimit === null) {
    return null;
  }

  const buffer = createAdaptiveCharacterBuffer(settings.characterLimit, config);

  if (settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS) {
    return settings.characterLimit + buffer;
  }

  return Math.max(1, settings.characterLimit - buffer);
};

type CharacterLimitIssue = {
  code: 'custom';
  path: ['characterLimit'];
  message: string;
};

export const toCharacterLimitIssue = (message: string): CharacterLimitIssue => ({
  code: 'custom',
  path: ['characterLimit'],
  message
});
