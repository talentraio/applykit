import { describe, expect, it } from 'vitest';
import {
  createFallbackScoreBreakdown,
  normalizeBaselineScores
} from '../../../../server/services/llm/scoring';

describe('baseline scoring invariants', () => {
  it('normalizes baseline scores into 0..100 and keeps after >= before', () => {
    const normalized = normalizeBaselineScores({
      matchScoreBefore: -12,
      matchScoreAfter: 8
    });

    expect(normalized.matchScoreBefore).toBe(0);
    expect(normalized.matchScoreAfter).toBe(8);

    const normalizedWithLowerAfter = normalizeBaselineScores({
      matchScoreBefore: 84,
      matchScoreAfter: 70
    });

    expect(normalizedWithLowerAfter.matchScoreBefore).toBe(84);
    expect(normalizedWithLowerAfter.matchScoreAfter).toBe(84);
  });

  it('builds fallback breakdown from normalized baseline scores', () => {
    const breakdown = createFallbackScoreBreakdown({
      matchScoreBefore: 102,
      matchScoreAfter: 95
    });

    expect(breakdown.version).toBe('fallback-keyword-v1');
    expect(breakdown.components.core.before).toBe(100);
    expect(breakdown.components.core.after).toBe(100);
    expect(breakdown.components.mustHave.after).toBe(100);
  });
});
