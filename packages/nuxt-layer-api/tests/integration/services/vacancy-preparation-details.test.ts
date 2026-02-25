import { beforeEach, describe, expect, it, vi } from 'vitest';

const vacancyRepositoryMock = {
  findByIdAndUserId: vi.fn()
};

const generationRepositoryMock = {
  findLatestOverviewByVacancyId: vi.fn()
};

const generationScoreDetailRepositoryMock = {
  findByGenerationId: vi.fn()
};

const userRepositoryMock = {
  findById: vi.fn()
};

const resolveScenarioModelMock = vi.fn();

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

const createErrorShim = (input: { statusCode: number; message: string }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

vi.mock('../../../server/data/repositories', () => ({
  vacancyRepository: vacancyRepositoryMock,
  generationRepository: generationRepositoryMock,
  generationScoreDetailRepository: generationScoreDetailRepositoryMock,
  userRepository: userRepositoryMock
}));

vi.mock('../../../server/services/llm', () => ({
  resolveScenarioModel: resolveScenarioModelMock
}));

beforeEach(() => {
  vacancyRepositoryMock.findByIdAndUserId.mockReset();
  generationRepositoryMock.findLatestOverviewByVacancyId.mockReset();
  generationScoreDetailRepositoryMock.findByGenerationId.mockReset();
  userRepositoryMock.findById.mockReset();
  resolveScenarioModelMock.mockReset();
  requireUserSessionMock.mockClear();
  getRouterParamMock.mockClear();
  userRepositoryMock.findById.mockResolvedValue({
    id: 'user-1',
    role: 'friend'
  });

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    requireUserSession: requireUserSessionMock,
    getRouterParam: getRouterParamMock,
    createError: createErrorShim
  });
});

describe('vacancy preparation details endpoint', () => {
  it('returns details payload and regenerate flags when stale details exist', async () => {
    vacancyRepositoryMock.findByIdAndUserId.mockResolvedValueOnce({
      id: 'vacancy-1',
      company: 'Acme',
      jobPosition: 'Planner',
      description: 'Updated vacancy description',
      canGenerateResume: true
    });

    generationRepositoryMock.findLatestOverviewByVacancyId.mockResolvedValueOnce({
      id: 'generation-1',
      matchScoreBefore: 60,
      matchScoreAfter: 74,
      expiresAt: new Date(Date.now() + 60_000)
    });

    generationScoreDetailRepositoryMock.findByGenerationId.mockResolvedValueOnce({
      id: 'detail-1',
      generationId: 'generation-1',
      vacancyId: 'vacancy-1',
      vacancyVersionMarker: 'old-marker',
      details: {
        summary: { before: 60, after: 74, improvement: 14 },
        matched: [],
        gaps: [],
        recommendations: [],
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
      provider: 'openai',
      model: 'gpt-4.1-mini',
      strategyKey: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    resolveScenarioModelMock.mockResolvedValueOnce({
      source: 'scenario_default'
    });

    const handlerModule = await import('../../../server/api/vacancies/[id]/preparation.get');

    const response = await handlerModule.default({
      params: {
        id: 'vacancy-1'
      }
    } as never);

    expect(response.latestGeneration?.id).toBe('generation-1');
    expect(response.scoreDetails).not.toBeNull();
    expect(response.scoreDetailsStale).toBe(true);
    expect(response.canRequestDetails).toBe(true);
    expect(response.canRegenerateDetails).toBe(true);
  });

  it('returns preparation payload without details when details table is missing', async () => {
    vacancyRepositoryMock.findByIdAndUserId.mockResolvedValueOnce({
      id: 'vacancy-1',
      company: 'Acme',
      jobPosition: 'Planner',
      description: 'Updated vacancy description',
      canGenerateResume: true
    });

    generationRepositoryMock.findLatestOverviewByVacancyId.mockResolvedValueOnce({
      id: 'generation-1',
      matchScoreBefore: 60,
      matchScoreAfter: 74,
      expiresAt: new Date(Date.now() + 60_000)
    });

    generationScoreDetailRepositoryMock.findByGenerationId.mockRejectedValueOnce({
      code: '42P01',
      message: 'relation "generation_score_details" does not exist'
    });

    resolveScenarioModelMock.mockResolvedValueOnce({
      source: 'scenario_default'
    });

    const handlerModule = await import('../../../server/api/vacancies/[id]/preparation.get');

    const response = await handlerModule.default({
      params: {
        id: 'vacancy-1'
      }
    } as never);

    expect(response.latestGeneration?.id).toBe('generation-1');
    expect(response.scoreDetails).toBeNull();
    expect(response.scoreDetailsStale).toBe(false);
    expect(response.canRequestDetails).toBe(true);
    expect(response.canRegenerateDetails).toBe(false);
  });
});
