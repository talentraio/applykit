import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = {
  findScenario: vi.fn(),
  isModelActive: vi.fn(),
  upsertScenarioDefault: vi.fn(),
  upsertRoleOverride: vi.fn()
};

vi.mock('../../../server/data/repositories', () => ({
  llmRoutingRepository: repositoryMock
}));

const requireSuperAdminMock = vi.fn(async () => {});
const readBodyMock = vi.fn(async (event: { body: unknown }) => event.body);
const getRouterParamMock = vi.fn(
  (event: { params?: Record<string, string> }, key: string): string | undefined =>
    event.params?.[key]
);

const createErrorShim = (input: { statusCode: number; message: string; data?: unknown }): Error => {
  const error = new Error(input.message);
  Object.assign(error, input);
  return error;
};

beforeEach(() => {
  repositoryMock.findScenario.mockReset();
  repositoryMock.isModelActive.mockReset();
  repositoryMock.upsertScenarioDefault.mockReset();
  repositoryMock.upsertRoleOverride.mockReset();

  requireSuperAdminMock.mockClear();
  readBodyMock.mockClear();
  getRouterParamMock.mockClear();

  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    requireSuperAdmin: requireSuperAdminMock,
    readBody: readBodyMock,
    getRouterParam: getRouterParamMock,
    createError: createErrorShim
  });
});

describe('admin llm routing api integration', () => {
  it('normalizes retry/strategy for scoring default assignment', async () => {
    repositoryMock.findScenario.mockResolvedValueOnce({
      key: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING
    });
    repositoryMock.isModelActive.mockResolvedValue(true);
    repositoryMock.upsertScenarioDefault.mockResolvedValueOnce({
      scenarioKey: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING,
      default: {
        modelId: '11111111-1111-4111-8111-111111111111',
        retryModelId: null,
        strategyKey: null,
        temperature: null,
        maxTokens: null,
        responseFormat: null,
        updatedAt: new Date('2026-02-11T00:00:00Z')
      },
      overrides: []
    });

    const handlerModule =
      await import('../../../server/api/admin/llm/routing/[scenarioKey]/default.put');

    const event = {
      params: {
        scenarioKey: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING
      },
      body: {
        modelId: '11111111-1111-4111-8111-111111111111',
        retryModelId: '22222222-2222-4222-8222-222222222222',
        strategyKey: 'quality'
      }
    };

    await handlerModule.default(event as never);

    expect(repositoryMock.upsertScenarioDefault).toHaveBeenCalledWith(
      LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING,
      expect.objectContaining({
        retryModelId: null,
        strategyKey: null
      })
    );
  });

  it('keeps adaptation strategy and retry for role override assignment', async () => {
    repositoryMock.findScenario.mockResolvedValueOnce({
      key: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
    });
    repositoryMock.isModelActive.mockResolvedValue(true);
    repositoryMock.upsertRoleOverride.mockResolvedValueOnce({
      scenarioKey: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
      default: null,
      overrides: []
    });

    const handlerModule =
      await import('../../../server/api/admin/llm/routing/[scenarioKey]/roles/[role].put');

    const event = {
      params: {
        scenarioKey: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
        role: 'friend'
      },
      body: {
        modelId: '11111111-1111-4111-8111-111111111111',
        retryModelId: '22222222-2222-4222-8222-222222222222',
        strategyKey: 'quality'
      }
    };

    await handlerModule.default(event as never);

    expect(repositoryMock.upsertRoleOverride).toHaveBeenCalledWith(
      LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
      'friend',
      expect.objectContaining({
        retryModelId: '22222222-2222-4222-8222-222222222222',
        strategyKey: 'quality'
      })
    );
  });
});
