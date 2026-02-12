import type { ResumeContent, ScoreBreakdown } from '@int/schema';

export type ScoringEvidenceSignalType = 'core' | 'mustHave' | 'niceToHave' | 'responsibility';

export type ScoringEvidenceItem = {
  signalType: ScoringEvidenceSignalType;
  signalName: string;
  strengthBefore: number;
  strengthAfter: number;
  presentBefore: boolean;
  presentAfter: boolean;
  evidenceRefsBefore: string[];
  evidenceRefsAfter: string[];
};

export type DeterministicScoringResult = {
  matchScoreBefore: number;
  matchScoreAfter: number;
  scoreBreakdown: ScoreBreakdown;
};

export type BaselineScores = {
  matchScoreBefore: number;
  matchScoreAfter: number;
};

const SCORE_WEIGHTS = {
  core: 0.35,
  mustHave: 0.3,
  niceToHave: 0.1,
  responsibilities: 0.15,
  human: 0.1
} as const;

const HUMAN_CLICHE_PATTERNS = [
  /results-driven/gi,
  /detail-oriented/gi,
  /passionate/gi,
  /team player/gi,
  /fast-paced environment/gi,
  /proven track record/gi,
  /hard[- ]working/gi,
  /self-starter/gi
];

const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
};

const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
};

export function normalizeBaselineScores(scores: BaselineScores): BaselineScores {
  const matchScoreBefore = clampScore(scores.matchScoreBefore);
  const matchScoreAfter = Math.max(clampScore(scores.matchScoreAfter), matchScoreBefore);

  return {
    matchScoreBefore,
    matchScoreAfter
  };
}

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

const toComponentScore = (items: ScoringEvidenceItem[]): { before: number; after: number } => {
  if (items.length === 0) {
    return {
      before: 60,
      after: 60
    };
  }

  const beforeSignalStrength = average(
    items.map(item => {
      const presence = item.presentBefore ? 0.2 : 0;
      return clampUnit(item.strengthBefore + presence);
    })
  );

  const afterSignalStrength = average(
    items.map(item => {
      const presence = item.presentAfter ? 0.2 : 0;
      return clampUnit(item.strengthAfter + presence);
    })
  );

  return {
    before: clampScore(30 + beforeSignalStrength * 70),
    after: clampScore(30 + afterSignalStrength * 70)
  };
};

const flattenTextValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(entry => flattenTextValues(entry));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(entry => flattenTextValues(entry));
  }

  return [];
};

const evaluateHumanScore = (resume: ResumeContent): number => {
  const text = flattenTextValues(resume).join(' ').replace(/\s+/g, ' ').trim();

  if (text.length === 0) {
    return 55;
  }

  let score = 82;

  const clicheCount = HUMAN_CLICHE_PATTERNS.reduce((acc, pattern) => {
    const matches = text.match(pattern);
    return acc + (matches?.length ?? 0);
  }, 0);

  score -= Math.min(16, clicheCount * 2);

  const words = text.split(' ').filter(Boolean);
  const avgWordLength = words.length > 0 ? words.join('').length / words.length : 0;
  if (avgWordLength > 7) {
    score -= 3;
  }

  const lines = flattenTextValues(resume)
    .flatMap(value => value.split('\n'))
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    const starts = lines.map(line => line.split(/\s+/)[0]?.toLowerCase() ?? '').filter(Boolean);

    if (starts.length > 0) {
      const uniqueStartsRatio = new Set(starts).size / starts.length;
      if (uniqueStartsRatio < 0.5) {
        score -= 5;
      }
    }
  }

  const longSentencePenalty = Math.min(8, Math.max(0, Math.round((text.length - 3800) / 500)));
  score -= longSentencePenalty;

  return clampScore(score);
};

const toWeightedComposite = (parts: {
  core: number;
  mustHave: number;
  niceToHave: number;
  responsibilities: number;
  human: number;
}): number => {
  return clampScore(
    parts.core * SCORE_WEIGHTS.core +
      parts.mustHave * SCORE_WEIGHTS.mustHave +
      parts.niceToHave * SCORE_WEIGHTS.niceToHave +
      parts.responsibilities * SCORE_WEIGHTS.responsibilities +
      parts.human * SCORE_WEIGHTS.human
  );
};

const toScoreBreakdown = (values: {
  core: { before: number; after: number };
  mustHave: { before: number; after: number };
  niceToHave: { before: number; after: number };
  responsibilities: { before: number; after: number };
  human: { before: number; after: number };
  version: string;
}): ScoreBreakdown => {
  return {
    version: values.version,
    components: {
      core: {
        before: values.core.before,
        after: values.core.after,
        weight: SCORE_WEIGHTS.core
      },
      mustHave: {
        before: values.mustHave.before,
        after: values.mustHave.after,
        weight: SCORE_WEIGHTS.mustHave
      },
      niceToHave: {
        before: values.niceToHave.before,
        after: values.niceToHave.after,
        weight: SCORE_WEIGHTS.niceToHave
      },
      responsibilities: {
        before: values.responsibilities.before,
        after: values.responsibilities.after,
        weight: SCORE_WEIGHTS.responsibilities
      },
      human: {
        before: values.human.before,
        after: values.human.after,
        weight: SCORE_WEIGHTS.human
      }
    },
    gateStatus: {
      schemaValid: true,
      identityStable: true,
      hallucinationFree: true
    }
  };
};

export function computeDeterministicScoringResult(input: {
  baseResume: ResumeContent;
  tailoredResume: ResumeContent;
  evidenceItems: ScoringEvidenceItem[];
}): DeterministicScoringResult {
  const core = toComponentScore(input.evidenceItems.filter(item => item.signalType === 'core'));
  const mustHave = toComponentScore(
    input.evidenceItems.filter(item => item.signalType === 'mustHave')
  );
  const niceToHave = toComponentScore(
    input.evidenceItems.filter(item => item.signalType === 'niceToHave')
  );
  const responsibilities = toComponentScore(
    input.evidenceItems.filter(item => item.signalType === 'responsibility')
  );

  const human = {
    before: evaluateHumanScore(input.baseResume),
    after: evaluateHumanScore(input.tailoredResume)
  };

  const compositeBefore = toWeightedComposite({
    core: core.before,
    mustHave: mustHave.before,
    niceToHave: niceToHave.before,
    responsibilities: responsibilities.before,
    human: human.before
  });

  const compositeAfter = toWeightedComposite({
    core: core.after,
    mustHave: mustHave.after,
    niceToHave: niceToHave.after,
    responsibilities: responsibilities.after,
    human: human.after
  });

  const matchScoreBefore = compositeBefore;
  const matchScoreAfter = Math.max(compositeAfter, matchScoreBefore);

  return {
    matchScoreBefore,
    matchScoreAfter,
    scoreBreakdown: toScoreBreakdown({
      core,
      mustHave,
      niceToHave,
      responsibilities,
      human,
      version: 'deterministic-v1'
    })
  };
}

export function createFallbackScoreBreakdown(scores: {
  matchScoreBefore: number;
  matchScoreAfter: number;
}): ScoreBreakdown {
  const normalized = normalizeBaselineScores(scores);

  return toScoreBreakdown({
    core: { before: normalized.matchScoreBefore, after: normalized.matchScoreAfter },
    mustHave: { before: normalized.matchScoreBefore, after: normalized.matchScoreAfter },
    niceToHave: { before: normalized.matchScoreBefore, after: normalized.matchScoreAfter },
    responsibilities: { before: normalized.matchScoreBefore, after: normalized.matchScoreAfter },
    human: { before: normalized.matchScoreBefore, after: normalized.matchScoreAfter },
    version: 'fallback-keyword-v1'
  });
}
