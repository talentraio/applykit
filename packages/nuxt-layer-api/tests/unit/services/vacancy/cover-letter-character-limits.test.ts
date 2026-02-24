import type { CoverLetterGenerationSettings } from '@int/schema';
import {
  COVER_LETTER_CHARACTER_BUFFER_DEFAULTS,
  COVER_LETTER_CHARACTER_LIMIT_DEFAULTS,
  COVER_LETTER_LENGTH_PRESET_MAP
} from '@int/schema';
import { describe, expect, it } from 'vitest';
import {
  createAdaptiveCharacterBuffer,
  createSoftCharacterTarget,
  getCharacterLimitValidationMessage,
  resolveCoverLetterCharacterBufferConfig,
  resolveCoverLetterCharacterLimits
} from '../../../../server/services/vacancy/cover-letter-character-limits';

const createSettings = (
  overrides: Partial<CoverLetterGenerationSettings> = {}
): CoverLetterGenerationSettings => ({
  language: 'en',
  market: 'default',
  grammaticalGender: 'neutral',
  type: 'message',
  tone: 'professional',
  lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS,
  characterLimit: 300,
  recipientName: null,
  includeSubjectLine: false,
  instructions: null,
  ...overrides
});

describe('resolveCoverLetterCharacterLimits', () => {
  it('uses configured min/max values', () => {
    const limits = resolveCoverLetterCharacterLimits({
      public: {
        coverLetter: {
          minLengthLimitCharacters: 120,
          maxLengthLimitCharacters: 2800
        }
      }
    });

    expect(limits).toEqual({ min: 120, max: 2800 });
  });

  it('swaps values when config min is greater than max', () => {
    const limits = resolveCoverLetterCharacterLimits({
      public: {
        coverLetter: {
          minLengthLimitCharacters: 3500,
          maxLengthLimitCharacters: 100
        }
      }
    });

    expect(limits).toEqual({ min: 100, max: 3500 });
  });

  it('falls back to defaults for invalid config values', () => {
    const limits = resolveCoverLetterCharacterLimits({
      public: {
        coverLetter: {
          minLengthLimitCharacters: 'abc',
          maxLengthLimitCharacters: undefined
        }
      }
    });

    expect(limits).toEqual({
      min: COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MIN,
      max: COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MAX
    });
  });
});

describe('resolveCoverLetterCharacterBufferConfig', () => {
  it('uses configured values', () => {
    const config = resolveCoverLetterCharacterBufferConfig({
      public: {
        coverLetter: {
          targetBufferRatio: 0.08,
          targetBufferSmallLimitThreshold: 140,
          targetBufferSmallMin: 6,
          targetBufferSmallMax: 10,
          targetBufferMin: 12,
          targetBufferMax: 26
        }
      }
    });

    expect(config).toEqual({
      targetBufferRatio: 0.08,
      targetBufferSmallLimitThreshold: 140,
      targetBufferSmallMin: 6,
      targetBufferSmallMax: 10,
      targetBufferMin: 12,
      targetBufferMax: 26
    });
  });

  it('normalizes and falls back for invalid values', () => {
    const config = resolveCoverLetterCharacterBufferConfig({
      public: {
        coverLetter: {
          targetBufferRatio: 'abc',
          targetBufferSmallLimitThreshold: 120,
          targetBufferSmallMin: 11,
          targetBufferSmallMax: 4,
          targetBufferMin: 31,
          targetBufferMax: 9
        }
      }
    });

    expect(config).toEqual({
      targetBufferRatio: COVER_LETTER_CHARACTER_BUFFER_DEFAULTS.TARGET_BUFFER_RATIO,
      targetBufferSmallLimitThreshold: 120,
      targetBufferSmallMin: 4,
      targetBufferSmallMax: 11,
      targetBufferMin: 9,
      targetBufferMax: 31
    });
  });

  it('supports percent-style ratio values above 1', () => {
    const config = resolveCoverLetterCharacterBufferConfig({
      public: {
        coverLetter: {
          targetBufferRatio: 7
        }
      }
    });

    expect(config.targetBufferRatio).toBe(0.07);
  });
});

describe('getCharacterLimitValidationMessage', () => {
  const limits = { min: 100, max: 3500 };

  it('returns null for non-message settings', () => {
    const message = getCharacterLimitValidationMessage(
      createSettings({ type: 'letter', lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD }),
      limits
    );

    expect(message).toBeNull();
  });

  it('returns null when value is inside bounds', () => {
    const message = getCharacterLimitValidationMessage(
      createSettings({
        characterLimit: 500,
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
      }),
      limits
    );

    expect(message).toBeNull();
  });

  it('returns error when value is below min', () => {
    const message = getCharacterLimitValidationMessage(
      createSettings({ characterLimit: 50 }),
      limits
    );

    expect(message).toBe('Minimum characters must be at least 100.');
  });

  it('returns error when value is above max', () => {
    const message = getCharacterLimitValidationMessage(
      createSettings({
        lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS,
        characterLimit: 4000
      }),
      limits
    );

    expect(message).toBe('Maximum characters must be at most 3500.');
  });
});

describe('soft character targets', () => {
  it('uses small-range buffer for small limits', () => {
    const settings = createSettings({
      lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS,
      characterLimit: 100
    });

    expect(createAdaptiveCharacterBuffer(100)).toBe(5);
    expect(createSoftCharacterTarget(settings)).toBe(95);
  });

  it('uses default-range buffer for larger limits', () => {
    const settings = createSettings({
      lengthPreset: COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS,
      characterLimit: 300
    });

    expect(createAdaptiveCharacterBuffer(300)).toBe(15);
    expect(createSoftCharacterTarget(settings)).toBe(315);
  });
});
