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
    cacheTokenEstimate: 1024
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

describe('vacancy detailed score fallback integration', () => {
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
      maxTokens: 3000,
      responseFormat: 'json',
      strategyKey: 'quality'
    });

    callLLMMock.mockRejectedValue(
      new MockLLMError('Failed to parse JSON: Unexpected end of JSON input', 'openai')
    );
  });

  it('returns heuristic details when provider returns parse-like JSON errors', async () => {
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
        userId: 'user-score-fallback'
      }
    );

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    expect(result.details.summary.after).toBeGreaterThanOrEqual(result.details.summary.before);
    expect(result.details.scoreBreakdown.version).toBe('deterministic-v1');
    expect(result.usage.attemptsUsed).toBe(1);
  });
});
