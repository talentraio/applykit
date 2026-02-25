import { describe, expect, it } from 'vitest';
import { resolveCoverLetterHumanizerConfig } from '../../../../server/services/vacancy/cover-letter-humanizer';

describe('resolveCoverLetterHumanizerConfig', () => {
  it('returns defaults when runtime config is empty', () => {
    const config = resolveCoverLetterHumanizerConfig({});

    expect(config).toEqual({
      minNaturalnessScore: 75,
      maxAiRiskScore: 35,
      maxRewritePasses: 1,
      debugLogs: true
    });
  });

  it('normalizes and clamps incoming values', () => {
    const config = resolveCoverLetterHumanizerConfig({
      llm: {
        coverLetterHumanizer: {
          minNaturalnessScore: '120',
          maxAiRiskScore: '-10',
          maxRewritePasses: '7',
          debugLogs: 'false'
        }
      }
    });

    expect(config).toEqual({
      minNaturalnessScore: 100,
      maxAiRiskScore: 0,
      maxRewritePasses: 3,
      debugLogs: false
    });
  });
});
