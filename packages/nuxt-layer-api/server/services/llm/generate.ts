import type {
  LLMProvider,
  LlmReasoningEffort,
  LlmScenarioKey,
  LlmStrategyKey,
  ProviderType,
  ResumeContent,
  Role,
  ScoreBreakdown
} from '@int/schema';
import {
  LLM_PROVIDER_MAP,
  LLM_SCENARIO_KEY_MAP,
  LLM_STRATEGY_KEY_MAP,
  ResumeContentSchema,
  USER_ROLE_MAP
} from '@int/schema';
import { z } from 'zod';
import { callLLM, getFallbackLlmModel, LLMError, resolveScenarioModel } from './index';
import {
  buildSharedResumeContext,
  createGeminiCachedContent,
  createGeminiCachedProviderOptions
} from './mullion';
import {
  BASELINE_SCORE_SYSTEM_PROMPT,
  createBaselineScoreUserPrompt
} from './prompts/baseline-score';
import { createGenerateUserPrompt, GENERATE_SYSTEM_PROMPT } from './prompts/generate';
import { createFallbackScoreBreakdown, normalizeBaselineScores } from './scoring';

const GenerateAdaptationResponseSchema = z.object({
  content: ResumeContentSchema
});

const BaselineScoreResponseSchema = z.object({
  matchScoreBefore: z.number().int().min(0).max(100),
  matchScoreAfter: z.number().int().min(0).max(100)
});

const WORD_PATTERN = /[a-z0-9][a-z0-9+#-]*/g;
const MIN_WORD_LENGTH = 3;
const DEFAULT_GEMINI_CACHE_TTL_SECONDS = 300;
const BASELINE_SCORING_MAX_TOKENS = 800;

type LlmUsageBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type GenerateOptions = {
  userId?: string;
  role?: Role;
  provider?: LLMProvider;
  maxRetries?: number;
  scoringMaxRetries?: number;
  temperature?: number;
  scoringTemperature?: number;
};

export type GenerateStepUsage = {
  cost: number;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  provider: LLMProvider;
  providerType: ProviderType;
  model: string;
  attemptsUsed: number;
};

export type GenerateLLMResult = {
  content: ResumeContent;
  matchScoreBefore: number;
  matchScoreAfter: number;
  scoreBreakdown: ScoreBreakdown;
  adaptation: GenerateStepUsage;
  scoring: GenerateStepUsage | null;
  scoringFallbackUsed: boolean;
};

export class GenerateLLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR'
      | 'INVALID_JSON'
      | 'INVALID_SCORES',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GenerateLLMError';
  }
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

const parseJSON = (content: string): unknown => {
  const jsonString = extractJSON(content);

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new GenerateLLMError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_JSON',
      { response: content }
    );
  }
};

const parseAdaptationContent = (content: string): ResumeContent => {
  const parsed = parseJSON(content);
  const validationResult = GenerateAdaptationResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new GenerateLLMError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  return validationResult.data.content;
};

const parseBaselineScores = (
  content: string
): { matchScoreBefore: number; matchScoreAfter: number } => {
  const parsed = parseJSON(content);
  const validationResult = BaselineScoreResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new GenerateLLMError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  return {
    matchScoreBefore: validationResult.data.matchScoreBefore,
    matchScoreAfter: Math.max(
      validationResult.data.matchScoreAfter,
      validationResult.data.matchScoreBefore
    )
  };
};

const toUsageBreakdown = (
  usage:
    | {
        inputTokens: number;
        outputTokens: number;
        cachedInputTokens?: number;
      }
    | undefined
): LlmUsageBreakdown => {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0
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

const tokenizeWords = (value: string): string[] => {
  const words = value.toLowerCase().match(WORD_PATTERN);
  if (!words) {
    return [];
  }

  return words.filter(word => word.length >= MIN_WORD_LENGTH);
};

const toWordSet = (value: string): Set<string> => {
  return new Set(tokenizeWords(value));
};

const toResumeWordSet = (resume: ResumeContent): Set<string> => {
  return new Set(tokenizeWords(flattenTextValues(resume).join(' ')));
};

const clampScore = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const calculateCoverage = (keywords: Set<string>, corpus: Set<string>): number => {
  if (keywords.size === 0) {
    return 0;
  }

  let matches = 0;
  keywords.forEach(keyword => {
    if (corpus.has(keyword)) {
      matches++;
    }
  });

  return matches / keywords.size;
};

const buildDeterministicFallbackResult = (
  baseResume: ResumeContent,
  tailoredResume: ResumeContent,
  vacancyDescription: string
): {
  matchScoreBefore: number;
  matchScoreAfter: number;
  scoreBreakdown: ScoreBreakdown;
} => {
  const vacancyKeywords = toWordSet(vacancyDescription);

  if (vacancyKeywords.size === 0) {
    const normalizedScores = normalizeBaselineScores({
      matchScoreBefore: 62,
      matchScoreAfter: 74
    });

    return {
      matchScoreBefore: normalizedScores.matchScoreBefore,
      matchScoreAfter: normalizedScores.matchScoreAfter,
      scoreBreakdown: createFallbackScoreBreakdown(normalizedScores)
    };
  }

  const baseCoverage = calculateCoverage(vacancyKeywords, toResumeWordSet(baseResume));
  const tailoredCoverage = calculateCoverage(vacancyKeywords, toResumeWordSet(tailoredResume));

  const rawMatchScoreBefore = clampScore(42 + baseCoverage * 46);
  const rawImprovement = clampScore(Math.max(tailoredCoverage - baseCoverage, 0) * 30);
  const minimalGain = tailoredCoverage >= baseCoverage ? 2 : 0;
  const normalizedScores = normalizeBaselineScores({
    matchScoreBefore: rawMatchScoreBefore,
    matchScoreAfter: clampScore(
      Math.max(rawMatchScoreBefore, rawMatchScoreBefore + rawImprovement + minimalGain)
    )
  });

  return {
    matchScoreBefore: normalizedScores.matchScoreBefore,
    matchScoreAfter: normalizedScores.matchScoreAfter,
    scoreBreakdown: createFallbackScoreBreakdown(normalizedScores)
  };
};

const toRole = (role?: Role): Role => {
  return role ?? USER_ROLE_MAP.PUBLIC;
};

const resolveScenarioTarget = async (
  role: Role,
  scenario: LlmScenarioKey
): Promise<{ provider: LLMProvider; model: string }> => {
  const scenarioModel = await resolveScenarioModel(role, scenario);
  if (scenarioModel) {
    return {
      provider: scenarioModel.primary.provider,
      model: scenarioModel.primary.model
    };
  }

  const fallbackModel = getFallbackLlmModel();
  return {
    provider: fallbackModel.provider,
    model: fallbackModel.model
  };
};

const resolveGenerationStrategy = async (role: Role): Promise<LlmStrategyKey> => {
  const scenarioModel = await resolveScenarioModel(role, LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION);
  return scenarioModel?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const toPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return fallback;
};

const getGeminiCacheConfig = (): { enabled: boolean; ttlSeconds: number } => {
  const runtimeConfig = useRuntimeConfig();
  const enabled = runtimeConfig.llm?.geminiCache?.enabled !== false;
  const ttlSeconds = toPositiveInteger(
    runtimeConfig.llm?.geminiCache?.ttlSeconds,
    DEFAULT_GEMINI_CACHE_TTL_SECONDS
  );

  return {
    enabled,
    ttlSeconds
  };
};

const getPlatformGeminiApiKey = (): string | null => {
  const runtimeConfig = useRuntimeConfig();
  const apiKey = runtimeConfig.llm?.geminiApiKey;
  return typeof apiKey === 'string' && apiKey.trim().length > 0 ? apiKey : null;
};

const runAdaptationStep = async (
  sharedContextPrompt: string,
  strategyKey: LlmStrategyKey,
  options: GenerateOptions
): Promise<{ content: ResumeContent; usage: GenerateStepUsage }> => {
  const maxRetries = options.maxRetries ?? 2;
  let totalCost = 0;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedInputTokens = 0;
  let lastError: GenerateLLMError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const retryReasoningEffort: LlmReasoningEffort | undefined = attempt > 1 ? 'medium' : undefined;

    try {
      const response = await callLLM(
        {
          prompt: `${GENERATE_SYSTEM_PROMPT}\n\n${createGenerateUserPrompt(
            sharedContextPrompt,
            strategyKey
          )}`,
          temperature: options.temperature ?? 0.3,
          maxTokens: 6000,
          responseFormat: 'json',
          reasoningEffort: retryReasoningEffort
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
          scenarioPhase: attempt > 1 ? 'retry' : 'primary',
          respectRequestMaxTokens: attempt > 1,
          respectRequestReasoningEffort: attempt > 1
        }
      );

      totalCost += response.cost;
      totalTokens += response.tokensUsed;
      const usageBreakdown = toUsageBreakdown(response.usage);
      totalInputTokens += usageBreakdown.inputTokens;
      totalOutputTokens += usageBreakdown.outputTokens;
      totalCachedInputTokens += usageBreakdown.cachedInputTokens;

      return {
        content: parseAdaptationContent(response.content),
        usage: {
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cachedInputTokens: totalCachedInputTokens,
          provider: response.provider,
          providerType: response.providerType,
          model: response.model,
          attemptsUsed: attempt
        }
      };
    } catch (error) {
      if (error instanceof GenerateLLMError) {
        lastError = error;
      } else if (error instanceof LLMError) {
        lastError = new GenerateLLMError(`LLM error: ${error.message}`, 'LLM_ERROR', error);
      } else {
        lastError = new GenerateLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error
        );
      }
    }
  }

  throw (
    lastError ?? new GenerateLLMError('Failed to generate tailored resume', 'MAX_RETRIES_EXCEEDED')
  );
};

const runBaselineScoringStep = async (
  sharedContextPrompt: string,
  tailoredResume: ResumeContent,
  options: GenerateOptions,
  providerOptions?: Record<string, Record<string, unknown>>
): Promise<{
  scores: {
    matchScoreBefore: number;
    matchScoreAfter: number;
    scoreBreakdown: ScoreBreakdown;
  };
  usage: GenerateStepUsage;
}> => {
  const maxRetries = Math.max(1, Math.min(options.scoringMaxRetries ?? 2, 2));
  let totalCost = 0;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedInputTokens = 0;
  let lastError: GenerateLLMError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(
        {
          prompt: `${BASELINE_SCORE_SYSTEM_PROMPT}\n\n${createBaselineScoreUserPrompt(
            sharedContextPrompt,
            tailoredResume
          )}`,
          temperature: options.scoringTemperature ?? 0,
          maxTokens: BASELINE_SCORING_MAX_TOKENS,
          responseFormat: 'json',
          reasoningEffort: 'low',
          providerOptions
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING,
          scenarioPhase: attempt > 1 ? 'retry' : 'primary'
        }
      );

      totalCost += response.cost;
      totalTokens += response.tokensUsed;
      const usageBreakdown = toUsageBreakdown(response.usage);
      totalInputTokens += usageBreakdown.inputTokens;
      totalOutputTokens += usageBreakdown.outputTokens;
      totalCachedInputTokens += usageBreakdown.cachedInputTokens;

      const parsedScores = parseBaselineScores(response.content);
      const normalizedScores = normalizeBaselineScores(parsedScores);

      return {
        scores: {
          matchScoreBefore: normalizedScores.matchScoreBefore,
          matchScoreAfter: normalizedScores.matchScoreAfter,
          scoreBreakdown: createFallbackScoreBreakdown(normalizedScores)
        },
        usage: {
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cachedInputTokens: totalCachedInputTokens,
          provider: response.provider,
          providerType: response.providerType,
          model: response.model,
          attemptsUsed: attempt
        }
      };
    } catch (error) {
      if (error instanceof GenerateLLMError) {
        lastError = error;
      } else if (error instanceof LLMError) {
        lastError = new GenerateLLMError(`LLM error: ${error.message}`, 'LLM_ERROR', error);
      } else {
        lastError = new GenerateLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error
        );
      }
    }
  }

  throw (
    lastError ?? new GenerateLLMError('Failed to calculate baseline score', 'MAX_RETRIES_EXCEEDED')
  );
};

const resolveScoringProviderOptions = async (
  role: Role,
  sharedContextPrompt: string
): Promise<Record<string, Record<string, unknown>> | undefined> => {
  const scoringTarget = await resolveScenarioTarget(
    role,
    LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING
  );
  if (scoringTarget.provider !== LLM_PROVIDER_MAP.GEMINI) {
    return undefined;
  }

  const cacheConfig = getGeminiCacheConfig();
  const geminiApiKey = getPlatformGeminiApiKey();
  if (!cacheConfig.enabled || !geminiApiKey) {
    return undefined;
  }

  const cachedContent = await createGeminiCachedContent({
    apiKey: geminiApiKey,
    model: scoringTarget.model,
    sharedContextPrompt,
    ttlSeconds: cacheConfig.ttlSeconds
  });

  if (!cachedContent) {
    return undefined;
  }

  return createGeminiCachedProviderOptions(scoringTarget.model, cachedContent);
};

export async function generateResumeWithLLM(
  baseResume: ResumeContent,
  vacancy: {
    company: string;
    jobPosition: string | null;
    description: string;
  },
  profile?: {
    preferredJobTitle?: string | null;
    targetIndustries?: string | null;
    careerGoals?: string | null;
  },
  options: GenerateOptions = {}
): Promise<GenerateLLMResult> {
  const runtimeRole = toRole(options.role);
  const adaptationTarget = await resolveScenarioTarget(
    runtimeRole,
    LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
  );
  const strategyKey = await resolveGenerationStrategy(runtimeRole);

  const sharedContext = buildSharedResumeContext(
    {
      baseResume,
      vacancy,
      profile
    },
    {
      provider: adaptationTarget.provider,
      model: adaptationTarget.model
    }
  );

  const adaptationResult = await runAdaptationStep(sharedContext.prompt, strategyKey, options);

  const scoringProviderOptions = await resolveScoringProviderOptions(
    runtimeRole,
    sharedContext.prompt
  );

  try {
    const scoringResult = await runBaselineScoringStep(
      sharedContext.prompt,
      adaptationResult.content,
      options,
      scoringProviderOptions
    );

    return {
      content: adaptationResult.content,
      matchScoreBefore: scoringResult.scores.matchScoreBefore,
      matchScoreAfter: scoringResult.scores.matchScoreAfter,
      scoreBreakdown: scoringResult.scores.scoreBreakdown,
      adaptation: adaptationResult.usage,
      scoring: scoringResult.usage,
      scoringFallbackUsed: false
    };
  } catch (error) {
    console.warn(
      `Baseline scoring step failed. Falling back to deterministic scores. Shared context estimate: ${sharedContext.cacheTokenEstimate} tokens.`,
      error instanceof Error ? error.message : error
    );

    const fallbackResult = buildDeterministicFallbackResult(
      baseResume,
      adaptationResult.content,
      vacancy.description
    );

    return {
      content: adaptationResult.content,
      matchScoreBefore: fallbackResult.matchScoreBefore,
      matchScoreAfter: fallbackResult.matchScoreAfter,
      scoreBreakdown: fallbackResult.scoreBreakdown,
      adaptation: adaptationResult.usage,
      scoring: null,
      scoringFallbackUsed: true
    };
  }
}
