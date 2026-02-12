import type {
  GenerationScoreDetailPayload,
  LLMProvider,
  LlmStrategyKey,
  ProviderType,
  ResumeContent,
  Role,
  ScoreBreakdown
} from '@int/schema';
import type { ScoringEvidenceItem } from './scoring';
import {
  LLM_PROVIDER_MAP,
  LLM_SCENARIO_KEY_MAP,
  PROVIDER_TYPE_MAP,
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
  createExtractSignalsUserPrompt,
  createMapEvidenceUserPrompt,
  GENERATE_SCORE_SYSTEM_PROMPT
} from './prompts/generate-score';
import { computeDeterministicScoringResult } from './scoring';

const WeightedSignalSchema = z.object({
  name: z.string().trim().min(1),
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional().default(1)
});

const ExtractedSignalsSchema = z.object({
  coreRequirements: z.array(WeightedSignalSchema),
  mustHave: z.array(WeightedSignalSchema),
  niceToHave: z.array(WeightedSignalSchema),
  responsibilities: z.array(WeightedSignalSchema)
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
  evidenceRefBefore: z.string().trim().min(1).nullable().optional(),
  evidenceRefAfter: z.string().trim().min(1).nullable().optional(),
  evidenceRefsBefore: z.array(z.string().trim().min(1)).optional(),
  evidenceRefsAfter: z.array(z.string().trim().min(1)).optional()
});

const MapEvidenceResponseSchema = z.object({
  evidence: z.array(EvidenceItemSchema)
});

const DEFAULT_GEMINI_CACHE_TTL_SECONDS = 300;
const MAX_SCORING_SIGNAL_ITEMS = 6;
const MAX_SCORING_EVIDENCE_ITEMS = 20;
const MAX_SCORING_REF_ITEMS = 3;
const SCORING_EXTRACT_MAX_TOKENS = 2200;
const SCORING_MAP_MAX_TOKENS = 2200;
const HEURISTIC_SIGNAL_TERMS_LIMIT = 12;
const JSON_PARSE_ERROR_PATTERN =
  /failed to parse json|unexpected end of json input|unterminated|string in json|invalid json/i;
const NON_RECOVERABLE_LLM_ERROR_CODES = new Set([
  'AUTH_ERROR',
  'NO_PLATFORM_KEY',
  'PLATFORM_DISABLED',
  'ROLE_BUDGET_DISABLED',
  'DAILY_BUDGET_EXCEEDED',
  'WEEKLY_BUDGET_EXCEEDED',
  'MONTHLY_BUDGET_EXCEEDED',
  'GLOBAL_BUDGET_EXCEEDED',
  'RATE_LIMIT',
  'QUOTA_EXCEEDED'
]);
const HEURISTIC_DEFAULT_TERMS = [
  'api',
  'architecture',
  'leadership',
  'coaching',
  'collaboration',
  'automation'
];
const HEURISTIC_STOPWORDS = new Set([
  'about',
  'ability',
  'able',
  'across',
  'activity',
  'advanced',
  'after',
  'agile',
  'all',
  'also',
  'and',
  'any',
  'are',
  'around',
  'as',
  'at',
  'be',
  'because',
  'being',
  'best',
  'both',
  'bring',
  'building',
  'business',
  'but',
  'by',
  'can',
  'chance',
  'children',
  'colleague',
  'colleagues',
  'collaboration',
  'committed',
  'communication',
  'community',
  'company',
  'condition',
  'connected',
  'contributor',
  'core',
  'craft',
  'culture',
  'customer',
  'customers',
  'days',
  'delivery',
  'design',
  'different',
  'does',
  'during',
  'each',
  'employment',
  'encourage',
  'engineering',
  'ensuring',
  'experience',
  'external',
  'field',
  'for',
  'from',
  'fun',
  'get',
  'global',
  'group',
  'have',
  'help',
  'helping',
  'here',
  'how',
  'ideal',
  'if',
  'in',
  'including',
  'innovation',
  'insight',
  'insurance',
  'interconnected',
  'internal',
  'into',
  'is',
  'it',
  'join',
  'key',
  'know',
  'leadership',
  'learning',
  'left',
  'life',
  'means',
  'more',
  'new',
  'no',
  'note',
  'of',
  'offer',
  'offers',
  'on',
  'one',
  'ongoing',
  'only',
  'opportunities',
  'or',
  'our',
  'part',
  'partner',
  'people',
  'personalised',
  'phenomenal',
  'play',
  'please',
  'position',
  'possible',
  'prepare',
  'primary',
  'process',
  'products',
  'providing',
  'reviewed',
  'right',
  'role',
  'scheme',
  'secure',
  'seeking',
  'services',
  'should',
  'skills',
  'so',
  'solutions',
  'some',
  'soon',
  'strategy',
  'support',
  'technology',
  'team',
  'teams',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'through',
  'times',
  'to',
  'tools',
  'trust',
  'up',
  'us',
  'user',
  'users',
  'verbal',
  'we',
  'what',
  'when',
  'where',
  'which',
  'with',
  'within',
  'work',
  'would',
  'you',
  'your'
]);

type ExtractedSignals = z.infer<typeof ExtractedSignalsSchema>;
type ParsedEvidenceItem = z.infer<typeof EvidenceItemSchema>;
type ScoringEvidenceItems = ScoringEvidenceItem[];

type UsageBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type ScoreDetailsUsage = {
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

export type GenerateScoreDetailsOptions = {
  userId?: string;
  role?: Role;
  provider?: LLMProvider;
  maxRetries?: number;
  temperature?: number;
};

export type GenerateScoreDetailsResult = {
  details: GenerationScoreDetailPayload;
  usage: ScoreDetailsUsage;
  provider: LLMProvider;
  model: string;
  strategyKey: LlmStrategyKey | null;
};

export class ScoreDetailsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR'
      | 'INVALID_JSON',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ScoreDetailsError';
  }
}

const isJsonParseLikeMessage = (message: string): boolean => {
  return JSON_PARSE_ERROR_PATTERN.test(message.toLowerCase());
};

const appendMissingJsonClosures = (input: string): string | null => {
  const closingStack: Array<'}' | ']'> = [];
  let inString = false;
  let escaped = false;

  for (const char of input) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      closingStack.push('}');
      continue;
    }

    if (char === '[') {
      closingStack.push(']');
      continue;
    }

    if (char === '}' || char === ']') {
      const expected = closingStack.pop();
      if (expected !== char) {
        return null;
      }
    }
  }

  let completed = input;

  if (inString) {
    completed += '"';
  }

  for (let index = closingStack.length - 1; index >= 0; index -= 1) {
    completed += closingStack[index];
  }

  return completed;
};

const removeTrailingJsonSeparators = (input: string): string => {
  let normalized = input.trimEnd();

  while (normalized.length > 0 && /[,:]$/.test(normalized)) {
    normalized = normalized.slice(0, -1).trimEnd();
  }

  return normalized;
};

const tryRecoverTruncatedJson = (jsonString: string): unknown | null => {
  const normalized = jsonString.trim();
  if (normalized.length === 0) {
    return null;
  }

  const maxTrimLength = Math.max(0, Math.min(120, Math.floor(normalized.length * 0.2)));

  for (let trimLength = 0; trimLength <= maxTrimLength; trimLength += 1) {
    const candidatePrefix = normalized.slice(0, normalized.length - trimLength);
    const candidate = removeTrailingJsonSeparators(candidatePrefix);
    if (candidate.length === 0) {
      continue;
    }

    const repaired = appendMissingJsonClosures(candidate);
    if (!repaired) {
      continue;
    }

    try {
      return JSON.parse(repaired);
    } catch {
      // Continue scanning shorter prefixes.
    }
  }

  return null;
};

const readLlmErrorCode = (details: unknown): string | null => {
  if (!details || typeof details !== 'object') {
    return null;
  }

  const rawCode = Reflect.get(details, 'code');
  if (typeof rawCode !== 'string' || rawCode.trim().length === 0) {
    return null;
  }

  return rawCode;
};

const shouldFallbackToHeuristicDetails = (error: ScoreDetailsError | null): boolean => {
  if (!error) {
    return false;
  }

  if (
    error.code === 'INVALID_JSON' ||
    error.code === 'VALIDATION_FAILED' ||
    error.code === 'MAX_RETRIES_EXCEEDED'
  ) {
    return true;
  }

  if (error.code !== 'LLM_ERROR') {
    return false;
  }

  const llmErrorCode = readLlmErrorCode(error.details);
  if (llmErrorCode && NON_RECOVERABLE_LLM_ERROR_CODES.has(llmErrorCode)) {
    return false;
  }

  return isJsonParseLikeMessage(error.message);
};

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

  if (jsonString.length === 0) {
    throw new ScoreDetailsError('Failed to parse JSON: empty LLM response', 'INVALID_JSON', {
      response: content
    });
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const recovered = tryRecoverTruncatedJson(jsonString);
    if (recovered !== null) {
      return recovered;
    }

    throw new ScoreDetailsError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_JSON',
      { response: content }
    );
  }
};

const parseExtractedSignals = (content: string): ExtractedSignals => {
  const parsed = parseJSON(content);
  const validationResult = ExtractSignalsResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new ScoreDetailsError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  const toTopSignals = (
    items: z.infer<typeof WeightedSignalSchema>[]
  ): z.infer<typeof WeightedSignalSchema>[] => {
    return [...items]
      .sort((left, right) => right.weight - left.weight)
      .slice(0, MAX_SCORING_SIGNAL_ITEMS);
  };

  return {
    ...validationResult.data.signals,
    coreRequirements: toTopSignals(validationResult.data.signals.coreRequirements),
    mustHave: toTopSignals(validationResult.data.signals.mustHave),
    niceToHave: toTopSignals(validationResult.data.signals.niceToHave),
    responsibilities: toTopSignals(validationResult.data.signals.responsibilities)
  };
};

const parseEvidenceItems = (content: string): ScoringEvidenceItems => {
  const parsed = parseJSON(content);
  const validationResult = MapEvidenceResponseSchema.safeParse(parsed);

  if (!validationResult.success) {
    throw new ScoreDetailsError(
      `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
      'VALIDATION_FAILED',
      validationResult.error.errors
    );
  }

  const normalizeRefs = (
    refs: string[] | undefined,
    singleRef: string | null | undefined
  ): string[] => {
    const compactFromArray = (refs ?? [])
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, MAX_SCORING_REF_ITEMS);

    if (compactFromArray.length > 0) {
      return compactFromArray;
    }

    if (typeof singleRef === 'string' && singleRef.trim().length > 0) {
      return [singleRef.trim()];
    }

    return [];
  };

  return validationResult.data.evidence.slice(0, MAX_SCORING_EVIDENCE_ITEMS).map(
    (item: ParsedEvidenceItem): ScoringEvidenceItem => ({
      signalType: item.signalType,
      signalName: item.signalName,
      strengthBefore: item.strengthBefore,
      strengthAfter: item.strengthAfter,
      presentBefore: item.presentBefore,
      presentAfter: item.presentAfter,
      evidenceRefsBefore: normalizeRefs(item.evidenceRefsBefore, item.evidenceRefBefore),
      evidenceRefsAfter: normalizeRefs(item.evidenceRefsAfter, item.evidenceRefAfter)
    })
  );
};

const toUsageBreakdown = (
  usage:
    | {
        inputTokens: number;
        outputTokens: number;
        cachedInputTokens?: number;
      }
    | undefined
): UsageBreakdown => {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0
  };
};

const toRole = (role?: Role): Role => {
  return role ?? USER_ROLE_MAP.PUBLIC;
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

const resolveScenarioTarget = async (
  role: Role
): Promise<{
  provider: LLMProvider;
  model: string;
  strategyKey: LlmStrategyKey | null;
}> => {
  const scenarioModel = await resolveScenarioModel(
    role,
    LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL
  );
  if (scenarioModel) {
    return {
      provider: scenarioModel.primary.provider,
      model: scenarioModel.primary.model,
      strategyKey: scenarioModel.strategyKey
    };
  }

  const fallbackModel = getFallbackLlmModel();
  return {
    provider: fallbackModel.provider,
    model: fallbackModel.model,
    strategyKey: null
  };
};

const resolveScoringProviderOptions = async (
  provider: LLMProvider,
  model: string,
  sharedContextPrompt: string
): Promise<Record<string, Record<string, unknown>> | undefined> => {
  if (provider !== LLM_PROVIDER_MAP.GEMINI) {
    return undefined;
  }

  const cacheConfig = getGeminiCacheConfig();
  const geminiApiKey = getPlatformGeminiApiKey();
  if (!cacheConfig.enabled || !geminiApiKey) {
    return undefined;
  }

  const cachedContent = await createGeminiCachedContent({
    apiKey: geminiApiKey,
    model,
    sharedContextPrompt,
    ttlSeconds: cacheConfig.ttlSeconds
  });

  if (!cachedContent) {
    return undefined;
  }

  return createGeminiCachedProviderOptions(model, cachedContent);
};

const clampScore = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const clampUnit = (value: number): number => {
  return Math.max(0, Math.min(1, value));
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

const toResumeText = (resume: ResumeContent): string => {
  return flattenTextValues(resume).join(' ').toLowerCase();
};

const pickHeuristicSignalTerms = (description: string): string[] => {
  const words = description.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
  const frequency = new Map<string, number>();

  words.forEach(word => {
    if (HEURISTIC_STOPWORDS.has(word)) {
      return;
    }

    const currentCount = frequency.get(word) ?? 0;
    frequency.set(word, currentCount + 1);
  });

  const ranked = [...frequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([word]) => word)
    .slice(0, HEURISTIC_SIGNAL_TERMS_LIMIT);

  if (ranked.length === 0) {
    return HEURISTIC_DEFAULT_TERMS;
  }

  return ranked;
};

const toWeightedSignals = (
  terms: string[],
  startIndex: number,
  endIndex: number,
  baseWeight: number
): z.infer<typeof WeightedSignalSchema>[] => {
  return terms.slice(startIndex, endIndex).map((name, index) => ({
    name,
    weight: clampUnit(baseWeight - index * 0.08),
    confidence: 0.6
  }));
};

const createHeuristicSignals = (description: string): ExtractedSignals => {
  const terms = pickHeuristicSignalTerms(description);

  return {
    coreRequirements: toWeightedSignals(terms, 0, 2, 0.95),
    mustHave: toWeightedSignals(terms, 2, 6, 0.85),
    niceToHave: toWeightedSignals(terms, 6, 9, 0.6),
    responsibilities: toWeightedSignals(terms, 9, 12, 0.65)
  };
};

const toHeuristicStrength = (
  resumeText: string,
  signal: string
): { present: boolean; strength: number } => {
  const present = resumeText.includes(signal.toLowerCase());

  if (!present) {
    return {
      present: false,
      strength: 0
    };
  }

  return {
    present: true,
    strength: 0.65
  };
};

const createHeuristicEvidenceItems = (
  signals: ExtractedSignals,
  baseResume: ResumeContent,
  tailoredResume: ResumeContent
): ScoringEvidenceItems => {
  const baseText = toResumeText(baseResume);
  const tailoredText = toResumeText(tailoredResume);

  const collect = (
    signalType: ScoringEvidenceItem['signalType'],
    items: z.infer<typeof WeightedSignalSchema>[]
  ): ScoringEvidenceItems => {
    return items.map(item => {
      const before = toHeuristicStrength(baseText, item.name);
      const after = toHeuristicStrength(tailoredText, item.name);

      return {
        signalType,
        signalName: item.name,
        strengthBefore: before.strength,
        strengthAfter: Math.max(after.strength, before.strength),
        presentBefore: before.present,
        presentAfter: after.present,
        evidenceRefsBefore: [],
        evidenceRefsAfter: []
      };
    });
  };

  return [
    ...collect('core', signals.coreRequirements),
    ...collect('mustHave', signals.mustHave),
    ...collect('niceToHave', signals.niceToHave),
    ...collect('responsibility', signals.responsibilities)
  ];
};

const buildHeuristicDetailsPayload = (input: {
  baseResume: ResumeContent;
  tailoredResume: ResumeContent;
  vacancyDescription: string;
}): GenerationScoreDetailPayload => {
  const signals = createHeuristicSignals(input.vacancyDescription);
  const evidenceItems = createHeuristicEvidenceItems(
    signals,
    input.baseResume,
    input.tailoredResume
  );
  const computed = computeDeterministicScoringResult({
    baseResume: input.baseResume,
    tailoredResume: input.tailoredResume,
    evidenceItems
  });

  return toDetailsPayload(computed, signals, evidenceItems);
};

const buildWeightMap = (signals: ExtractedSignals): Map<string, number> => {
  const map = new Map<string, number>();

  const put = (
    type: 'core' | 'mustHave' | 'niceToHave' | 'responsibility',
    items: z.infer<typeof WeightedSignalSchema>[]
  ): void => {
    items.forEach(item => {
      map.set(`${type}:${item.name.toLowerCase()}`, item.weight);
    });
  };

  put('core', signals.coreRequirements);
  put('mustHave', signals.mustHave);
  put('niceToHave', signals.niceToHave);
  put('responsibility', signals.responsibilities);

  return map;
};

const resolveSignalWeight = (
  signalWeights: Map<string, number>,
  item: ScoringEvidenceItem
): number => {
  return signalWeights.get(`${item.signalType}:${item.signalName.toLowerCase()}`) ?? 0.1;
};

const toDetailedItem = (
  signalWeights: Map<string, number>,
  item: ScoringEvidenceItem
): GenerationScoreDetailPayload['matched'][number] => {
  return {
    signalType: item.signalType,
    signal: item.signalName,
    weight: resolveSignalWeight(signalWeights, item),
    strengthBefore: item.strengthBefore,
    strengthAfter: item.strengthAfter,
    presentBefore: item.presentBefore,
    presentAfter: item.presentAfter,
    evidenceBefore: item.evidenceRefsBefore,
    evidenceAfter: item.evidenceRefsAfter
  };
};

const buildRecommendations = (
  gaps: GenerationScoreDetailPayload['gaps']
): GenerationScoreDetailPayload['recommendations'] => {
  const recommendations = gaps.slice(0, 6).map(item => {
    if (!item.presentAfter) {
      return `Add concise evidence for "${item.signal}" in the most relevant experience section.`;
    }

    return `Strengthen "${item.signal}" with clearer impact and context in existing bullets.`;
  });

  if (recommendations.length === 0) {
    return ['Current tailored resume covers key signals well. Keep phrasing concise and specific.'];
  }

  return recommendations;
};

function toDetailsPayload(
  computed: { matchScoreBefore: number; matchScoreAfter: number; scoreBreakdown: ScoreBreakdown },
  signals: ExtractedSignals,
  evidenceItems: ScoringEvidenceItem[]
): GenerationScoreDetailPayload {
  const signalWeights = buildWeightMap(signals);

  const matched = evidenceItems
    .filter(item => item.presentAfter && item.strengthAfter >= 0.45)
    .map(item => toDetailedItem(signalWeights, item))
    .sort((left, right) => right.weight * right.strengthAfter - left.weight * left.strengthAfter)
    .slice(0, 16);

  const gaps = evidenceItems
    .filter(item => !item.presentAfter || item.strengthAfter < 0.45)
    .map(item => toDetailedItem(signalWeights, item))
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 16);

  return {
    summary: {
      before: clampScore(computed.matchScoreBefore),
      after: clampScore(Math.max(computed.matchScoreAfter, computed.matchScoreBefore)),
      improvement: clampScore(Math.max(computed.matchScoreAfter - computed.matchScoreBefore, 0))
    },
    matched,
    gaps,
    recommendations: buildRecommendations(gaps),
    scoreBreakdown: computed.scoreBreakdown
  };
}

export async function generateScoreDetailsWithLLM(
  baseResume: ResumeContent,
  tailoredResume: ResumeContent,
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
  options: GenerateScoreDetailsOptions = {}
): Promise<GenerateScoreDetailsResult> {
  const runtimeRole = toRole(options.role);
  const scenarioTarget = await resolveScenarioTarget(runtimeRole);

  const sharedContext = buildSharedResumeContext(
    {
      baseResume,
      vacancy,
      profile
    },
    {
      provider: scenarioTarget.provider,
      model: scenarioTarget.model
    }
  );

  const providerOptions = await resolveScoringProviderOptions(
    scenarioTarget.provider,
    scenarioTarget.model,
    sharedContext.prompt
  );

  const maxRetries = Math.max(1, Math.min(options.maxRetries ?? 2, 3));
  let totalCost = 0;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCachedInputTokens = 0;
  let lastError: ScoreDetailsError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const extractResponse = await callLLM(
        {
          prompt: `${GENERATE_SCORE_SYSTEM_PROMPT}\n\n${createExtractSignalsUserPrompt(
            sharedContext.prompt
          )}`,
          temperature: options.temperature ?? 0,
          maxTokens: SCORING_EXTRACT_MAX_TOKENS,
          responseFormat: 'json',
          providerOptions
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
          scenarioPhase: attempt > 1 ? 'retry' : 'primary',
          respectRequestMaxTokens: true
        }
      );

      totalCost += extractResponse.cost;
      totalTokens += extractResponse.tokensUsed;
      const extractUsageBreakdown = toUsageBreakdown(extractResponse.usage);
      totalInputTokens += extractUsageBreakdown.inputTokens;
      totalOutputTokens += extractUsageBreakdown.outputTokens;
      totalCachedInputTokens += extractUsageBreakdown.cachedInputTokens;

      const signals = parseExtractedSignals(extractResponse.content);

      const mapResponse = await callLLM(
        {
          prompt: `${GENERATE_SCORE_SYSTEM_PROMPT}\n\n${createMapEvidenceUserPrompt(
            sharedContext.prompt,
            tailoredResume,
            signals
          )}`,
          temperature: options.temperature ?? 0,
          maxTokens: SCORING_MAP_MAX_TOKENS,
          responseFormat: 'json',
          providerOptions
        },
        {
          userId: options.userId,
          role: options.role,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
          scenarioPhase: attempt > 1 ? 'retry' : 'primary',
          respectRequestMaxTokens: true
        }
      );

      totalCost += mapResponse.cost;
      totalTokens += mapResponse.tokensUsed;
      const mapUsageBreakdown = toUsageBreakdown(mapResponse.usage);
      totalInputTokens += mapUsageBreakdown.inputTokens;
      totalOutputTokens += mapUsageBreakdown.outputTokens;
      totalCachedInputTokens += mapUsageBreakdown.cachedInputTokens;

      const evidenceItems = parseEvidenceItems(mapResponse.content);
      const computed = computeDeterministicScoringResult({
        baseResume,
        tailoredResume,
        evidenceItems
      });

      return {
        details: toDetailsPayload(computed, signals, evidenceItems),
        usage: {
          cost: totalCost,
          tokensUsed: totalTokens,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cachedInputTokens: totalCachedInputTokens,
          provider: mapResponse.provider,
          providerType: mapResponse.providerType,
          model: mapResponse.model,
          attemptsUsed: attempt
        },
        provider: mapResponse.provider,
        model: mapResponse.model,
        strategyKey: scenarioTarget.strategyKey
      };
    } catch (error) {
      if (error instanceof ScoreDetailsError) {
        lastError = error;
      } else if (error instanceof LLMError) {
        const llmMessage = error.message;
        lastError = new ScoreDetailsError(
          isJsonParseLikeMessage(llmMessage) ? llmMessage : `LLM error: ${llmMessage}`,
          isJsonParseLikeMessage(llmMessage) ? 'INVALID_JSON' : 'LLM_ERROR',
          error
        );
      } else {
        const unexpectedMessage = error instanceof Error ? error.message : 'Unknown error';
        const isJsonError = isJsonParseLikeMessage(unexpectedMessage);
        lastError = new ScoreDetailsError(
          isJsonError ? unexpectedMessage : `Unexpected error: ${unexpectedMessage}`,
          isJsonError ? 'INVALID_JSON' : 'LLM_ERROR',
          error
        );
      }
    }
  }

  if (shouldFallbackToHeuristicDetails(lastError)) {
    const fallbackErrorMessage = lastError?.message ?? 'Unknown error';
    console.warn(
      `Detailed scoring LLM output parsing failed. Falling back to deterministic heuristic details. Shared context estimate: ${sharedContext.cacheTokenEstimate} tokens.`,
      fallbackErrorMessage
    );

    return {
      details: buildHeuristicDetailsPayload({
        baseResume,
        tailoredResume,
        vacancyDescription: vacancy.description
      }),
      usage: {
        cost: totalCost,
        tokensUsed: totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cachedInputTokens: totalCachedInputTokens,
        provider: scenarioTarget.provider,
        providerType: PROVIDER_TYPE_MAP.PLATFORM,
        model: scenarioTarget.model,
        attemptsUsed: maxRetries
      },
      provider: scenarioTarget.provider,
      model: scenarioTarget.model,
      strategyKey: scenarioTarget.strategyKey
    };
  }

  throw (
    lastError ??
    new ScoreDetailsError('Failed to generate detailed scoring', 'MAX_RETRIES_EXCEEDED')
  );
}
