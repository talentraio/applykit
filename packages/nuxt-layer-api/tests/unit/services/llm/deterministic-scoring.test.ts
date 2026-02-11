import type { ResumeContent } from '@int/schema';
import { describe, expect, it } from 'vitest';
import {
  computeDeterministicScoringResult,
  createFallbackScoreBreakdown
} from '../../../../server/services/llm/scoring';

const baseResume: ResumeContent = {
  personalInfo: {
    fullName: 'Alex Doe',
    email: 'alex@example.com'
  },
  experience: [
    {
      companyName: 'Acme Co',
      position: 'Operations Specialist',
      startDate: '2022-01',
      endDate: '2024-01',
      responsibilities: ['Managed office operations', 'Prepared weekly reports']
    }
  ],
  education: [],
  skills: ['Reporting', 'Excel', 'Process improvement']
};

const tailoredResume: ResumeContent = {
  ...baseResume,
  experience: [
    {
      ...baseResume.experience[0],
      responsibilities: [
        'Managed office operations and cross-team processes',
        'Prepared weekly KPI reports for leadership'
      ]
    }
  ],
  skills: ['Reporting', 'Excel', 'Process improvement', 'Stakeholder communication']
};

describe('deterministic scoring', () => {
  it('computes before/after scores with invariant after >= before', () => {
    const result = computeDeterministicScoringResult({
      baseResume,
      tailoredResume,
      evidenceItems: [
        {
          signalType: 'core',
          signalName: 'Process management',
          strengthBefore: 0.45,
          strengthAfter: 0.8,
          presentBefore: true,
          presentAfter: true,
          evidenceRefsBefore: ['experience[0].responsibilities[0]'],
          evidenceRefsAfter: ['experience[0].responsibilities[0]']
        },
        {
          signalType: 'mustHave',
          signalName: 'Reporting',
          strengthBefore: 0.6,
          strengthAfter: 0.9,
          presentBefore: true,
          presentAfter: true,
          evidenceRefsBefore: ['skills[0]'],
          evidenceRefsAfter: ['skills[0]']
        },
        {
          signalType: 'responsibility',
          signalName: 'Leadership updates',
          strengthBefore: 0.2,
          strengthAfter: 0.7,
          presentBefore: false,
          presentAfter: true,
          evidenceRefsBefore: [],
          evidenceRefsAfter: ['experience[0].responsibilities[1]']
        }
      ]
    });

    expect(result.matchScoreBefore).toBeGreaterThanOrEqual(0);
    expect(result.matchScoreAfter).toBeLessThanOrEqual(100);
    expect(result.matchScoreAfter).toBeGreaterThanOrEqual(result.matchScoreBefore);
    expect(result.scoreBreakdown.version).toBe('deterministic-v1');
  });

  it('creates fallback score breakdown with fallback version', () => {
    const breakdown = createFallbackScoreBreakdown({
      matchScoreBefore: 63,
      matchScoreAfter: 75
    });

    expect(breakdown.version).toBe('fallback-keyword-v1');
    expect(breakdown.components.core.before).toBe(63);
    expect(breakdown.components.core.after).toBe(75);
  });
});
