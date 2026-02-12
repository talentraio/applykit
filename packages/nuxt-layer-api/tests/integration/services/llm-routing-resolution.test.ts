import type { LlmModel, LlmScenarioKey, Role } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP, USER_ROLE_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveRuntimeModelMock = vi.fn();

vi.mock('../../../server/data/repositories', () => ({
  llmRoutingRepository: {
    resolveRuntimeModel: resolveRuntimeModelMock
  }
}));

const baseModel: LlmModel = {
  id: '11111111-1111-4111-8111-111111111111',
  provider: 'openai',
  modelKey: 'gpt-4.1-mini',
  displayName: 'GPT 4.1 mini',
  status: 'active',
  inputPricePer1mUsd: 0.4,
  outputPricePer1mUsd: 1.6,
  cachedInputPricePer1mUsd: 0.1,
  maxContextTokens: 128000,
  maxOutputTokens: 8192,
  supportsJson: true,
  supportsTools: true,
  supportsStreaming: true,
  notes: null,
  createdAt: new Date('2026-02-01T00:00:00Z'),
  updatedAt: new Date('2026-02-01T00:00:00Z')
};

const retryModel: LlmModel = {
  ...baseModel,
  id: '22222222-2222-4222-8222-222222222222',
  provider: 'gemini',
  modelKey: 'gemini-2.5-flash',
  displayName: 'Gemini 2.5 Flash'
};

const scenario = LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION as LlmScenarioKey;
const detailedScoringScenario =
  LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL as LlmScenarioKey;
const role = USER_ROLE_MAP.FRIEND as Role;

describe('llm routing runtime resolution', () => {
  beforeEach(() => {
    resolveRuntimeModelMock.mockReset();
  });

  it('resolves role override first and keeps strategy + retry metadata', async () => {
    resolveRuntimeModelMock.mockResolvedValueOnce({
      source: 'role_override',
      assignment: {
        modelId: baseModel.id,
        retryModelId: retryModel.id,
        temperature: 0.2,
        maxTokens: 3500,
        responseFormat: 'json',
        strategyKey: 'quality',
        updatedAt: new Date('2026-02-10T00:00:00Z')
      },
      model: baseModel,
      retryModel
    });

    const { resolveScenarioModel } = await import('../../../server/services/llm/routing');
    const resolved = await resolveScenarioModel(role, scenario);

    expect(resolveRuntimeModelMock).toHaveBeenCalledWith(role, scenario);
    expect(resolved).not.toBeNull();
    expect(resolved?.source).toBe('role_override');
    expect(resolved?.primary.provider).toBe('openai');
    expect(resolved?.retry?.provider).toBe('gemini');
    expect(resolved?.strategyKey).toBe('quality');
  });

  it('returns null when routing cannot resolve model', async () => {
    resolveRuntimeModelMock.mockResolvedValueOnce(null);

    const { resolveScenarioModel } = await import('../../../server/services/llm/routing');
    const resolved = await resolveScenarioModel(role, scenario);

    expect(resolved).toBeNull();
  });

  it('resolves dedicated detailed scoring scenario with runtime precedence metadata', async () => {
    resolveRuntimeModelMock.mockResolvedValueOnce({
      source: 'scenario_default',
      assignment: {
        modelId: baseModel.id,
        retryModelId: null,
        temperature: 0,
        maxTokens: 1800,
        responseFormat: 'json',
        strategyKey: null,
        updatedAt: new Date('2026-02-11T00:00:00Z')
      },
      model: baseModel,
      retryModel: null
    });

    const { resolveScenarioModel } = await import('../../../server/services/llm/routing');
    const resolved = await resolveScenarioModel(role, detailedScoringScenario);

    expect(resolveRuntimeModelMock).toHaveBeenCalledWith(role, detailedScoringScenario);
    expect(resolved).not.toBeNull();
    expect(resolved?.source).toBe('scenario_default');
    expect(resolved?.retry).toBeNull();
    expect(resolved?.temperature).toBe(0);
    expect(resolved?.responseFormat).toBe('json');
  });
});
