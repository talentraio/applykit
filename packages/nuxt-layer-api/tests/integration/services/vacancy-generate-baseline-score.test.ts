import type { ResumeContent } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP, USER_ROLE_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const callLLMMock = vi.fn();
const resolveScenarioModelMock = vi.fn();

vi.mock('../../../server/services/llm/index', () => ({
  callLLM: callLLMMock,
  resolveScenarioModel: resolveScenarioModelMock,
  getFallbackLlmModel: () => ({
    provider: 'openai',
    model: 'gpt-4.1-mini',
    price: {
      input: 0.4,
      output: 1.6,
      cache: 0
    }
  }),
  LLMError: class MockLLMError extends Error {}
}));

vi.mock('../../../server/services/llm/mullion', () => ({
  buildSharedResumeContext: ({ vacancy }: { vacancy: { description: string } }) => ({
    prompt: `VACANCY:${vacancy.description}`,
    cacheTokenEstimate: 900
  }),
  createGeminiCachedContent: vi.fn(),
  createGeminiCachedProviderOptions: vi.fn()
}));

const baseResume: ResumeContent = {
  personalInfo: {
    fullName: 'Jordan Doe',
    email: 'jordan@example.com'
  },
  experience: [],
  education: [],
  skills: [
    {
      type: 'Core',
      skills: ['Excel', 'Planning']
    }
  ]
};

describe('vacancy generate baseline score contract', () => {
  beforeEach(() => {
    callLLMMock.mockReset();
    resolveScenarioModelMock.mockReset();

    resolveScenarioModelMock.mockResolvedValue({
      source: 'scenario_default',
      primary: {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        inputPricePer1mUsd: 0.4,
        outputPricePer1mUsd: 1.6,
        cachedInputPricePer1mUsd: 0
      },
      retry: null,
      temperature: 0,
      maxTokens: 3000,
      responseFormat: 'json',
      strategyKey: 'economy'
    });

    callLLMMock.mockImplementation(async (_request, options) => {
      if (options?.scenario === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
        return {
          content: JSON.stringify({ content: baseResume }),
          tokensUsed: 100,
          cost: 0.001,
          provider: 'openai',
          providerType: 'platform',
          model: 'gpt-4.1-mini'
        };
      }

      if (options?.scenario === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING) {
        return {
          content: JSON.stringify({
            matchScoreBefore: 64,
            matchScoreAfter: 78
          }),
          tokensUsed: 60,
          cost: 0.0006,
          provider: 'openai',
          providerType: 'platform',
          model: 'gpt-4.1-mini'
        };
      }

      throw new Error('Unexpected scenario');
    });
  });

  it('returns baseline scoring fields without detailed-scoring dependency', async () => {
    const { generateResumeWithLLM } = await import('../../../server/services/llm/generate');

    const result = await generateResumeWithLLM(
      baseResume,
      {
        company: 'Acme',
        jobPosition: 'Planner',
        description: 'Need planning and reporting'
      },
      undefined,
      {
        role: USER_ROLE_MAP.PUBLIC,
        userId: 'user-2'
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);
    expect(result.matchScoreBefore).toBe(64);
    expect(result.matchScoreAfter).toBe(78);
    expect(result.scoringFallbackUsed).toBe(false);
    expect(result.scoring).not.toBeNull();
    expect(result.scoreBreakdown.version).toBe('fallback-keyword-v1');
    expect(result.adaptation.providerType).toBe('platform');
  });
});
