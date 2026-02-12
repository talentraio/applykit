import type { ResumeContent } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const callLLMMock = vi.fn();
const resolveScenarioModelMock = vi.fn();

class MockLLMError extends Error {
  provider: 'openai' | 'gemini';
  code?: string;

  constructor(message: string, provider: 'openai' | 'gemini' = 'openai', code?: string) {
    super(message);
    this.name = 'LLMError';
    this.provider = provider;
    this.code = code;
  }
}

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
  LLMError: MockLLMError
}));

vi.mock('../../../server/services/llm/mullion', () => ({
  buildSharedResumeContext: ({ vacancy }: { vacancy: { description: string } }) => ({
    prompt: `VACANCY:${vacancy.description}`,
    cacheTokenEstimate: 980
  }),
  createGeminiCachedContent: vi.fn(),
  createGeminiCachedProviderOptions: vi.fn()
}));

const baseResume: ResumeContent = {
  personalInfo: {
    fullName: 'Kostiantyn Horodniuk',
    email: 'feedback@horodnuk.dev'
  },
  experience: [
    {
      companyName: '5Pro Software',
      position: 'Full-Stack Developer',
      startDate: '2024-01',
      endDate: null,
      responsibilities: [
        'Designed application architecture for complex projects',
        'Integrated Angular with Laravel backend'
      ]
    }
  ],
  education: [],
  skills: [
    {
      type: 'Core',
      skills: ['Laravel', 'Angular', 'Vue.js', 'API design']
    }
  ]
};

describe('vacancy detailed score JSON repair integration', () => {
  beforeEach(() => {
    callLLMMock.mockReset();
    resolveScenarioModelMock.mockReset();

    resolveScenarioModelMock.mockResolvedValue({
      source: 'scenario_default',
      primary: {
        provider: 'openai',
        model: 'gpt-5-mini',
        inputPricePer1mUsd: 0.25,
        outputPricePer1mUsd: 2,
        cachedInputPricePer1mUsd: 0.025
      },
      retry: null,
      temperature: 0,
      maxTokens: 2000,
      responseFormat: 'json',
      strategyKey: 'quality'
    });

    callLLMMock.mockImplementation(async (request: { prompt?: string }) => {
      if (request.prompt?.includes('Extract structured vacancy signals as JSON.')) {
        return {
          content: `{"signals":{"coreRequirements":[{"name":"technical leadership","weight":0.9}],"mustHave":[{"name":"API economy","weight":0.85}],"niceToHave":[],"responsibilities":[{"name":"mentoring","weight":0.6}]`,
          tokensUsed: 120,
          cost: 0.001,
          provider: 'openai',
          providerType: 'platform',
          model: 'gpt-5-mini',
          usage: {
            inputTokens: 90,
            outputTokens: 30,
            cachedInputTokens: 0
          }
        };
      }

      return {
        content: JSON.stringify({
          evidence: [
            {
              signalType: 'mustHave',
              signalName: 'API economy',
              strengthBefore: 0.35,
              strengthAfter: 0.8,
              presentBefore: true,
              presentAfter: true,
              evidenceRefBefore: 'skills[0].skills[3]',
              evidenceRefAfter: 'experience[0].responsibilities[1]'
            }
          ]
        }),
        tokensUsed: 140,
        cost: 0.0015,
        provider: 'openai',
        providerType: 'platform',
        model: 'gpt-5-mini',
        usage: {
          inputTokens: 100,
          outputTokens: 40,
          cachedInputTokens: 0
        }
      };
    });
  });

  it('recovers truncated JSON and keeps detailed scoring flow successful', async () => {
    const { generateScoreDetailsWithLLM } =
      await import('../../../server/services/llm/score-details');

    const result = await generateScoreDetailsWithLLM(
      baseResume,
      baseResume,
      {
        company: 'LEGO Group',
        jobPosition: 'Principal Engineer',
        description:
          'Build API economy, technical leadership, architecture roadmap and mentoring culture.'
      },
      undefined,
      {
        role: USER_ROLE_MAP.FRIEND,
        userId: 'user-score-repair'
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(2);
    expect(result.usage.attemptsUsed).toBe(1);
    expect(result.details.matched.some(item => item.signal === 'API economy')).toBe(true);
  });
});
