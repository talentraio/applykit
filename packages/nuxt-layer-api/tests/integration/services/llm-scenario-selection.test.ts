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
  buildSharedResumeContext: ({
    baseResume,
    vacancy
  }: {
    baseResume: ResumeContent;
    vacancy: { description: string };
  }) => ({
    prompt: `BASE:${JSON.stringify(baseResume)}\nVACANCY:${vacancy.description}`,
    cacheTokenEstimate: 1200
  }),
  createGeminiCachedContent: vi.fn(),
  createGeminiCachedProviderOptions: vi.fn()
}));

const baseResume: ResumeContent = {
  personalInfo: {
    fullName: 'Taylor Doe',
    email: 'taylor@example.com'
  },
  experience: [],
  education: [],
  skills: [
    {
      type: 'Core',
      skills: ['Reporting']
    }
  ]
};

describe('llm scenario selection integration', () => {
  beforeEach(() => {
    callLLMMock.mockReset();
    resolveScenarioModelMock.mockReset();

    resolveScenarioModelMock.mockImplementation(async (_role, scenario) => {
      if (scenario === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
        return {
          source: 'scenario_default',
          primary: {
            provider: 'openai',
            model: 'gpt-4.1-mini',
            inputPricePer1mUsd: 0.4,
            outputPricePer1mUsd: 1.6,
            cachedInputPricePer1mUsd: 0
          },
          retry: null,
          temperature: 0.3,
          maxTokens: 6000,
          responseFormat: 'json',
          strategyKey: 'quality'
        };
      }

      if (scenario === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING) {
        return {
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
          strategyKey: null
        };
      }

      return null;
    });

    callLLMMock.mockImplementation(async (_request, options) => {
      if (options?.scenario === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
        return {
          content: JSON.stringify({
            content: {
              ...baseResume,
              summary: 'Tailored summary'
            }
          }),
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
            matchScoreBefore: 58,
            matchScoreAfter: 71
          }),
          tokensUsed: 50,
          cost: 0.0005,
          provider: 'openai',
          providerType: 'platform',
          model: 'gpt-4.1-mini'
        };
      }

      throw new Error('Unexpected scenario');
    });
  });

  it('uses strategy-specific adaptation prompt and baseline scoring scenario call', async () => {
    const { generateResumeWithLLM } = await import('../../../server/services/llm/generate');

    const result = await generateResumeWithLLM(
      baseResume,
      {
        company: 'Acme',
        jobPosition: 'Operations Manager',
        description: 'Need operations and reporting skills'
      },
      undefined,
      {
        role: USER_ROLE_MAP.FRIEND,
        userId: 'user-1'
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);

    const adaptationRequest = callLLMMock.mock.calls[0]?.[0];
    const adaptationOptions = callLLMMock.mock.calls[0]?.[1];

    expect(adaptationRequest.prompt).toContain('Strategy: quality');
    expect(adaptationOptions.scenario).toBe(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION);

    const scoringOptions = callLLMMock.mock.calls[1]?.[1];
    expect(scoringOptions.scenario).toBe(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING);

    expect(result.scoringFallbackUsed).toBe(false);
    expect(result.scoreBreakdown.version).toBe('fallback-keyword-v1');
  });
});
