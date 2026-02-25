import { beforeEach, describe, expect, it, vi } from 'vitest';

const vacancyRepositoryMock = {
  findById: vi.fn()
};

const generationRepositoryMock = {
  findById: vi.fn()
};

const generationScoreDetailRepositoryMock = {
  findByVacancyAndGeneration: vi.fn(),
  upsertByGeneration: vi.fn()
};

const resumeRepositoryMock = {
  findById: vi.fn()
};

const userRepositoryMock = {
  findById: vi.fn()
};

const resolveScenarioModelMock = vi.fn();
const generateScoreDetailsWithLLMMock = vi.fn();
const requireLimitMock = vi.fn(async () => {});
const logGenerateDetailedScoringMock = vi.fn(async () => {});

const requireUserSessionMock = vi.fn(async () => ({
  user: {
    id: 'user-1',
    role: 'friend'
  }
}));

const getRouterParamMock = vi.fn(
  (event: { params?: Record<string, string> }, key: string): string | undefined =>
    event.params?.[key]
);

const getQueryMock = vi.fn((event: { query?: Record<string, unknown> }) => event.query ?? {});

const createErrorShim = (input: { statusCode: number; message: string }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

vi.mock('../../../server/data/repositories', () => ({
  vacancyRepository: vacancyRepositoryMock,
  generationRepository: generationRepositoryMock,
  generationScoreDetailRepository: generationScoreDetailRepositoryMock,
  resumeRepository: resumeRepositoryMock,
  userRepository: userRepositoryMock
}));

vi.mock('../../../server/services/llm', () => ({
  resolveScenarioModel: resolveScenarioModelMock
}));

vi.mock('../../../server/services/llm/score-details', () => ({
  generateScoreDetailsWithLLM: generateScoreDetailsWithLLMMock
}));

vi.mock('../../../server/services/limits', () => ({
  requireLimit: requireLimitMock
}));

vi.mock('../../../server/utils/usage', () => ({
  logGenerateDetailedScoring: logGenerateDetailedScoringMock
}));

beforeEach(() => {
  vacancyRepositoryMock.findById.mockReset();
  generationRepositoryMock.findById.mockReset();
  generationScoreDetailRepositoryMock.findByVacancyAndGeneration.mockReset();
  generationScoreDetailRepositoryMock.upsertByGeneration.mockReset();
  resumeRepositoryMock.findById.mockReset();
  userRepositoryMock.findById.mockReset();
  resolveScenarioModelMock.mockReset();
  generateScoreDetailsWithLLMMock.mockReset();
  requireLimitMock.mockClear();
  logGenerateDetailedScoringMock.mockClear();
  requireUserSessionMock.mockClear();
  getRouterParamMock.mockClear();
  getQueryMock.mockClear();
  userRepositoryMock.findById.mockResolvedValue({
    id: 'user-1',
    role: 'friend'
  });

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    requireUserSession: requireUserSessionMock,
    getRouterParam: getRouterParamMock,
    getQuery: getQueryMock,
    createError: createErrorShim
  });
});

describe('vacancy score details endpoint reuse flow', () => {
  it('reuses persisted details when regenerate is false', async () => {
    vacancyRepositoryMock.findById.mockResolvedValueOnce({
      id: 'vacancy-1',
      userId: 'user-1',
      company: 'Acme',
      jobPosition: 'Planner',
      description: 'Need planning',
      canGenerateResume: false
    });

    generationRepositoryMock.findById.mockResolvedValueOnce({
      id: 'generation-1',
      vacancyId: 'vacancy-1',
      resumeId: 'resume-1',
      content: {},
      expiresAt: new Date(Date.now() + 60_000)
    });

    generationScoreDetailRepositoryMock.findByVacancyAndGeneration.mockResolvedValueOnce({
      id: 'detail-1',
      generationId: 'generation-1',
      vacancyId: 'vacancy-1',
      vacancyVersionMarker: 'marker',
      details: {
        summary: { before: 60, after: 72, improvement: 12 },
        matched: [],
        gaps: [],
        recommendations: [],
        scoreBreakdown: {
          version: 'deterministic-v1',
          components: {
            core: { before: 60, after: 72, weight: 0.35 },
            mustHave: { before: 60, after: 72, weight: 0.3 },
            niceToHave: { before: 60, after: 72, weight: 0.1 },
            responsibilities: { before: 60, after: 72, weight: 0.15 },
            human: { before: 60, after: 72, weight: 0.1 }
          },
          gateStatus: {
            schemaValid: true,
            identityStable: true,
            hallucinationFree: true
          }
        }
      }
    });

    const handlerModule =
      await import('../../../server/api/vacancies/[id]/generations/[generationId]/score-details.post');

    const response = await handlerModule.default({
      params: {
        id: 'vacancy-1',
        generationId: 'generation-1'
      },
      query: {
        regenerate: 'false'
      }
    } as never);

    expect(response.reused).toBe(true);
    expect(response.generationId).toBe('generation-1');
    expect(generateScoreDetailsWithLLMMock).not.toHaveBeenCalled();
    expect(generationScoreDetailRepositoryMock.upsertByGeneration).not.toHaveBeenCalled();
  });

  it('rejects regenerate when vacancy did not unlock regeneration', async () => {
    vacancyRepositoryMock.findById.mockResolvedValueOnce({
      id: 'vacancy-1',
      userId: 'user-1',
      company: 'Acme',
      jobPosition: 'Planner',
      description: 'Need planning',
      canGenerateResume: false
    });

    generationRepositoryMock.findById.mockResolvedValueOnce({
      id: 'generation-1',
      vacancyId: 'vacancy-1',
      resumeId: 'resume-1',
      content: {},
      expiresAt: new Date(Date.now() + 60_000)
    });

    generationScoreDetailRepositoryMock.findByVacancyAndGeneration.mockResolvedValueOnce({
      id: 'detail-1',
      generationId: 'generation-1',
      vacancyId: 'vacancy-1',
      vacancyVersionMarker: 'marker',
      details: {
        summary: { before: 60, after: 72, improvement: 12 },
        matched: [],
        gaps: [],
        recommendations: [],
        scoreBreakdown: {
          version: 'deterministic-v1',
          components: {
            core: { before: 60, after: 72, weight: 0.35 },
            mustHave: { before: 60, after: 72, weight: 0.3 },
            niceToHave: { before: 60, after: 72, weight: 0.1 },
            responsibilities: { before: 60, after: 72, weight: 0.15 },
            human: { before: 60, after: 72, weight: 0.1 }
          },
          gateStatus: {
            schemaValid: true,
            identityStable: true,
            hallucinationFree: true
          }
        }
      }
    });

    const handlerModule =
      await import('../../../server/api/vacancies/[id]/generations/[generationId]/score-details.post');

    await expect(
      handlerModule.default({
        params: {
          id: 'vacancy-1',
          generationId: 'generation-1'
        },
        query: {
          regenerate: 'true'
        }
      } as never)
    ).rejects.toMatchObject({
      statusCode: 400
    });
  });

  it('returns generated details when persistence table is missing', async () => {
    vacancyRepositoryMock.findById.mockResolvedValueOnce({
      id: 'vacancy-1',
      userId: 'user-1',
      company: 'Acme',
      jobPosition: 'Planner',
      description: 'Need planning',
      canGenerateResume: true
    });

    generationRepositoryMock.findById.mockResolvedValueOnce({
      id: 'generation-1',
      vacancyId: 'vacancy-1',
      resumeId: 'resume-1',
      content: {},
      expiresAt: new Date(Date.now() + 60_000)
    });

    generationScoreDetailRepositoryMock.findByVacancyAndGeneration.mockRejectedValueOnce({
      code: '42P01',
      message: 'relation "generation_score_details" does not exist'
    });

    resolveScenarioModelMock.mockResolvedValueOnce({
      source: 'scenario_default'
    });

    resumeRepositoryMock.findById.mockResolvedValueOnce({
      id: 'resume-1',
      userId: 'user-1',
      content: {}
    });

    generateScoreDetailsWithLLMMock.mockResolvedValueOnce({
      details: {
        summary: { before: 60, after: 74, improvement: 14 },
        matched: [],
        gaps: [],
        recommendations: ['Align architecture terms with JD wording.'],
        scoreBreakdown: {
          version: 'deterministic-v1',
          components: {
            core: { before: 60, after: 74, weight: 0.35 },
            mustHave: { before: 60, after: 74, weight: 0.3 },
            niceToHave: { before: 60, after: 74, weight: 0.1 },
            responsibilities: { before: 60, after: 74, weight: 0.15 },
            human: { before: 60, after: 74, weight: 0.1 }
          },
          gateStatus: {
            schemaValid: true,
            identityStable: true,
            hallucinationFree: true
          }
        }
      },
      usage: {
        cost: 0.004,
        tokensUsed: 1200,
        inputTokens: 900,
        outputTokens: 300,
        cachedInputTokens: 0,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini',
        attemptsUsed: 1
      },
      provider: 'openai',
      model: 'gpt-5-mini',
      strategyKey: 'quality'
    });

    const handlerModule =
      await import('../../../server/api/vacancies/[id]/generations/[generationId]/score-details.post');

    const response = await handlerModule.default({
      params: {
        id: 'vacancy-1',
        generationId: 'generation-1'
      },
      query: {
        regenerate: 'false'
      }
    } as never);

    expect(response.reused).toBe(false);
    expect(response.stale).toBe(false);
    expect(response.details.summary.after).toBe(74);
    expect(generationScoreDetailRepositoryMock.upsertByGeneration).not.toHaveBeenCalled();
  });
});
