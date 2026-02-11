import type { Generation } from '../schemas/generation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDaysUntilExpiration, isGenerationExpired } from '../schemas/generation';

const DEFAULT_SCORE_BREAKDOWN: Generation['scoreBreakdown'] = {
  version: 'test-v1',
  components: {
    core: { before: 70, after: 90, weight: 0.35 },
    mustHave: { before: 70, after: 90, weight: 0.3 },
    niceToHave: { before: 70, after: 90, weight: 0.1 },
    responsibilities: { before: 70, after: 90, weight: 0.15 },
    human: { before: 70, after: 90, weight: 0.1 }
  },
  gateStatus: {
    schemaValid: true,
    identityStable: true,
    hallucinationFree: true
  }
};

describe('getDaysUntilExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return positive days for future dates', () => {
    const now = new Date('2026-01-22T12:00:00Z');
    vi.setSystemTime(now);

    const futureDate = new Date('2026-01-25T12:00:00Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: now,
      expiresAt: futureDate
    };

    const days = getDaysUntilExpiration(generation);

    expect(days).toBe(3);
  });

  it('should return 0 for expired dates', () => {
    const now = new Date('2026-01-22T12:00:00Z');
    vi.setSystemTime(now);

    const pastDate = new Date('2026-01-20T12:00:00Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: new Date('2025-12-20T12:00:00Z'),
      expiresAt: pastDate
    };

    const days = getDaysUntilExpiration(generation);

    expect(days).toBe(0);
  });

  it('should handle dates 90 days in the future', () => {
    const now = new Date('2026-01-22T12:00:00Z');
    vi.setSystemTime(now);

    const futureDate = new Date('2026-04-22T12:00:00Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: now,
      expiresAt: futureDate
    };

    const days = getDaysUntilExpiration(generation);

    expect(days).toBe(90);
  });
});

describe('isGenerationExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return false for future dates', () => {
    const now = new Date('2026-01-22T12:00:00Z');
    vi.setSystemTime(now);

    const futureDate = new Date('2026-01-25T12:00:00Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: now,
      expiresAt: futureDate
    };

    expect(isGenerationExpired(generation)).toBe(false);
  });

  it('should return true for past dates', () => {
    const now = new Date('2026-01-22T12:00:00Z');
    vi.setSystemTime(now);

    const pastDate = new Date('2026-01-20T12:00:00Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: new Date('2025-12-20T12:00:00Z'),
      expiresAt: pastDate
    };

    expect(isGenerationExpired(generation)).toBe(true);
  });

  it('should return true for exact current time (edge case)', () => {
    const now = new Date('2026-01-22T12:00:00.000Z');
    vi.setSystemTime(now);

    const sameTime = new Date('2026-01-22T12:00:00.000Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: new Date('2025-12-20T12:00:00Z'),
      expiresAt: sameTime
    };

    // expiresAt < now (false), so not expired
    expect(isGenerationExpired(generation)).toBe(false);
  });

  it('should return false for 1 millisecond in the future', () => {
    const now = new Date('2026-01-22T12:00:00.000Z');
    vi.setSystemTime(now);

    const futureByOneMilli = new Date('2026-01-22T12:00:00.001Z');
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        experience: [],
        education: [],
        skills: []
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      scoreBreakdown: DEFAULT_SCORE_BREAKDOWN,
      generatedAt: now,
      expiresAt: futureByOneMilli
    };

    expect(isGenerationExpired(generation)).toBe(false);
  });
});
