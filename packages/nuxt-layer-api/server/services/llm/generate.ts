import type {
  LLMProvider,
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
import { createGenerateUserPrompt, GENERATE_SYSTEM_PROMPT } from './prompts/generate';
import {
  createExtractSignalsUserPrompt,
  createMapEvidenceUserPrompt,
  GENERATE_SCORE_SYSTEM_PROMPT
} from './prompts/generate-score';
import { computeDeterministicScoringResult, createFallbackScoreBreakdown } from './scoring';

const GenerateAdaptationResponseSchema = z.object({
  content: ResumeContentSchema
});

const WeightedSignalSchema = z.object({
  name: z.string().trim().min(1),
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

const ExtractedSignalsSchema = z.object({
  jobFamily: z.string().trim().min(1),
  seniority: z.string().trim().min(1).nullable().optional(),
  coreRequirements: z.array(WeightedSignalSchema),
  mustHave: z.array(WeightedSignalSchema),
  niceToHave: z.array(WeightedSignalSchema),
  responsibilities: z.array(WeightedSignalSchema),
  domainTerms: z.array(z.string().trim().min(1)),
  constraints: z.array(z.string().trim().min(1))
});

const ExtractSignalsResponseSchema = z.object({
  signals: ExtractedSignalsSchema
});

const EvidenceSignalTypeSchema = z.enum(['core', 'mustHave', 'niceToHave', 'responsibility']);

const EvidenceItemSchema = z.object({
  signalType: EvidenceSignalTypeSchema,
  signalName: z.string().trim().min(1),
  strengthBefore: z.number().min(0).max(1),
  strengthAfter: z.number().min(0).max(1),
  presentBefore: z.boolean(),
  presentAfter: z.boolean(),
  evidenceRefsBefore: z.array(z.string().trim().min(1)),
  evidenceRefsAfter: z.array(z.string().trim().min(1))
});

const MapEvidenceResponseSchema = z.object({
  evidence: z.array(EvidenceItemSchema)
});

const WORD_PATTERN = /[a-z0-9][a-z0-9+#-]*/g;
const MIN_WORD_LENGTH = 3;
const DEFAULT_GEMINI_CACHE_TTL_SECONDS = 300;

type ExtractedSignals = z.infer<typeof ExtractedSignalsSchema>;
type ScoringEvidenceItems = z.infer<typeof EvidenceItemSchema>[];

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

const parseExtractedSignals = (content: string): ExtractedSignals => {
  const parsed = parseJSON(content);
  const validationResult = ExtractSignalsResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new GenerateLLMError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  return validationResult.data.signals;
};

const parseEvidenceItems = (content: string): ScoringEvidenceItems => {
  const parsed = parseJSON(content);
  const validationResult = MapEvidenceResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new GenerateLLMError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  return validationResult.data.evidence;
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
    const matchScoreBefore = 62;
    const matchScoreAfter = 74;

    return {
      matchScoreBefore,
      matchScoreAfter,
      scoreBreakdown: createFallbackScoreBreakdown({
        matchScoreBefore,
        matchScoreAfter
      })
    };
  }

  const baseCoverage = calculateCoverage(vacancyKeywords, toResumeWordSet(baseResume));
  const tailoredCoverage = calculateCoverage(vacancyKeywords, toResumeWordSet(tailoredResume));

  const matchScoreBefore = clampScore(42 + baseCoverage * 46);
  const rawImprovement = clampScore(Math.max(tailoredCoverage - baseCoverage, 0) * 30);
  const minimalGain = tailoredCoverage >= baseCoverage ? 2 : 0;
  const matchScoreAfter = clampScore(
    Math.max(matchScoreBefore, matchScoreBefore + rawImprovement + minimalGain)
  );

  return {
    matchScoreBefore,
    matchScoreAfter,
    scoreBreakdown: createFallbackScoreBreakdown({
      matchScoreBefore,
      matchScoreAfter
    })
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
  let lastError: GenerateLLMError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(
        {
          systemMessage: GENERATE_SYSTEM_PROMPT,
          prompt: createGenerateUserPrompt(sharedContextPrompt, strategyKey),
          temperature: options.temperature ?? 0.3,
          maxTokens: 6000,
          responseFormat: 'json'
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
          scenarioPhase: attempt > 1 ? 'retry' : 'primary'
        }
      );

      totalCost += response.cost;
      totalTokens += response.tokensUsed;

      return {
        content: parseAdaptationContent(response.content),
        usage: {
          cost: totalCost,
          tokensUsed: totalTokens,
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

const runDeterministicScoringStep = async (
  sharedContextPrompt: string,
  baseResume: ResumeContent,
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
  // No dedicated scoring retry model in this phase; keep attempts minimal to control cost.
  const maxRetries = Math.max(1, Math.min(options.scoringMaxRetries ?? 1, 2));
  let totalCost = 0;
  let totalTokens = 0;
  let lastError: GenerateLLMError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const extractResponse = await callLLM(
        {
          systemMessage: GENERATE_SCORE_SYSTEM_PROMPT,
          prompt: createExtractSignalsUserPrompt(sharedContextPrompt),
          temperature: options.scoringTemperature ?? 0,
          maxTokens: 2000,
          responseFormat: 'json',
          providerOptions
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING,
          scenarioPhase: 'primary'
        }
      );

      totalCost += extractResponse.cost;
      totalTokens += extractResponse.tokensUsed;

      const signals = parseExtractedSignals(extractResponse.content);

      const mapResponse = await callLLM(
        {
          systemMessage: GENERATE_SCORE_SYSTEM_PROMPT,
          prompt: createMapEvidenceUserPrompt(sharedContextPrompt, tailoredResume, signals),
          temperature: options.scoringTemperature ?? 0,
          maxTokens: 3000,
          responseFormat: 'json',
          providerOptions
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING,
          scenarioPhase: 'primary'
        }
      );

      totalCost += mapResponse.cost;
      totalTokens += mapResponse.tokensUsed;

      const evidenceItems = parseEvidenceItems(mapResponse.content);
      const computed = computeDeterministicScoringResult({
        baseResume,
        tailoredResume,
        evidenceItems
      });

      return {
        scores: computed,
        usage: {
          cost: totalCost,
          tokensUsed: totalTokens,
          provider: mapResponse.provider,
          providerType: mapResponse.providerType,
          model: mapResponse.model,
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
    lastError ?? new GenerateLLMError('Failed to calculate match score', 'MAX_RETRIES_EXCEEDED')
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
    const scoringResult = await runDeterministicScoringStep(
      sharedContext.prompt,
      baseResume,
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
      `Scoring step failed. Falling back to deterministic scores. Shared context estimate: ${sharedContext.cacheTokenEstimate} tokens.`,
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
