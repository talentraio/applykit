import type { LLMProvider, ResumeContent } from '@int/schema';
import type { Provider as MullionProvider } from '@mullion/ai-sdk';
import { GoogleGenAI } from '@google/genai';
import { LLM_PROVIDER_MAP } from '@int/schema';
import {
  createCacheSegmentManager,
  createDeveloperContentConfig,
  createGeminiAdapter
} from '@mullion/ai-sdk';

const SHARED_CONTEXT_SYSTEM_PROMPT =
  'You are a resume adaptation assistant. Use only provided data and keep all facts accurate.';

const DEFAULT_SHARED_CONTEXT_PREFIX = 'Shared context for resume adaptation and scoring';
const DEFAULT_GEMINI_CACHE_TTL_SECONDS = 300;
const DEFAULT_OPENAI_PROMPT_CACHE_MIN_PREFIX_TOKENS = 1024;
const DEFAULT_OPENAI_PROMPT_CACHE_SAFETY_BUFFER_TOKENS = 256;
const OPENAI_CACHE_PADDING_SEGMENT_START = 'OPENAI_CACHE_PADDING_START';
const OPENAI_CACHE_PADDING_SEGMENT_END = 'OPENAI_CACHE_PADDING_END';
const OPENAI_CACHE_PADDING_ESTIMATED_TOKENS_PER_LINE = 12;

type SharedResumeContextInput = {
  baseResume: ResumeContent;
  vacancy: {
    company: string;
    jobPosition: string | null;
    description: string;
  };
  profile?: {
    preferredJobTitle?: string | null;
    targetIndustries?: string | null;
    careerGoals?: string | null;
  };
};

export type SharedResumeContext = {
  prompt: string;
  cacheTokenEstimate: number;
};

type OpenAiPromptCacheConfig = {
  enabled: boolean;
  minPrefixTokens: number;
  safetyBufferTokens: number;
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

const getOpenAiPromptCacheConfig = (): OpenAiPromptCacheConfig => {
  const runtimeConfig = useRuntimeConfig();

  return {
    enabled: runtimeConfig.llm?.openaiPromptCache?.enabled !== false,
    minPrefixTokens: toPositiveInteger(
      runtimeConfig.llm?.openaiPromptCache?.minPrefixTokens,
      DEFAULT_OPENAI_PROMPT_CACHE_MIN_PREFIX_TOKENS
    ),
    safetyBufferTokens: toPositiveInteger(
      runtimeConfig.llm?.openaiPromptCache?.safetyBufferTokens,
      DEFAULT_OPENAI_PROMPT_CACHE_SAFETY_BUFFER_TOKENS
    )
  };
};

const buildOpenAiPromptCachePadding = (missingTokens: number): string => {
  const linesCount = Math.max(
    1,
    Math.ceil(missingTokens / OPENAI_CACHE_PADDING_ESTIMATED_TOKENS_PER_LINE)
  );
  const body = Array.from(
    { length: linesCount },
    (_, index) =>
      `cache-padding-line-${index + 1}: stable prefix token block for openai prompt caching`
  ).join('\n');

  return `${OPENAI_CACHE_PADDING_SEGMENT_START}
${body}
${OPENAI_CACHE_PADDING_SEGMENT_END}`;
};

const ensureOpenAiCacheEligiblePrefix = (
  context: SharedResumeContext,
  provider: LLMProvider
): SharedResumeContext => {
  if (provider !== LLM_PROVIDER_MAP.OPENAI) {
    return context;
  }

  const config = getOpenAiPromptCacheConfig();
  if (!config.enabled) {
    return context;
  }

  const requiredPrefixTokens =
    Math.max(config.minPrefixTokens, DEFAULT_OPENAI_PROMPT_CACHE_MIN_PREFIX_TOKENS) +
    config.safetyBufferTokens;

  if (context.cacheTokenEstimate >= requiredPrefixTokens) {
    return context;
  }

  const missingTokens = requiredPrefixTokens - context.cacheTokenEstimate;
  const padding = buildOpenAiPromptCachePadding(missingTokens);
  const paddedPrompt = `${context.prompt}\n\n${padding}`;
  const paddingTokenEstimate = Math.ceil(padding.length / 4);

  return {
    prompt: paddedPrompt,
    cacheTokenEstimate: context.cacheTokenEstimate + paddingTokenEstimate
  };
};

const toMullionProvider = (provider: LLMProvider): MullionProvider => {
  if (provider === LLM_PROVIDER_MAP.OPENAI) {
    return 'openai';
  }

  if (provider === LLM_PROVIDER_MAP.GEMINI) {
    return 'google';
  }

  return 'other';
};

const buildFallbackSharedPrompt = (payload: object): SharedResumeContext => {
  const serialized = JSON.stringify(payload, null, 2);
  const prompt = `${DEFAULT_SHARED_CONTEXT_PREFIX}\n\n${serialized}`;
  const cacheTokenEstimate = Math.ceil(prompt.length / 4);

  return {
    prompt,
    cacheTokenEstimate
  };
};

export const buildSharedResumeContext = (
  input: SharedResumeContextInput,
  options: {
    provider: LLMProvider;
    model: string;
  }
): SharedResumeContext => {
  const payload = {
    vacancy: input.vacancy,
    profile: input.profile ?? null,
    baseResume: input.baseResume
  };

  try {
    const cacheManager = createCacheSegmentManager(
      toMullionProvider(options.provider),
      options.model,
      createDeveloperContentConfig({
        enabled: true,
        ttl: '5m'
      })
    );

    cacheManager.system(SHARED_CONTEXT_SYSTEM_PROMPT, {
      ttl: '5m',
      scope: 'system-only',
      force: true
    });
    cacheManager.segment('resume-adaptation-shared-context', payload, {
      ttl: '5m',
      scope: 'developer-content',
      force: true
    });

    const prompt = cacheManager
      .getSegments()
      .map(segment => segment.content)
      .join('\n\n');

    const context = {
      prompt,
      cacheTokenEstimate: cacheManager.getTotalTokens()
    };

    return ensureOpenAiCacheEligiblePrefix(context, options.provider);
  } catch (error) {
    console.warn(
      'Failed to build Mullion shared context, using fallback prompt payload:',
      error instanceof Error ? error.message : error
    );

    return ensureOpenAiCacheEligiblePrefix(buildFallbackSharedPrompt(payload), options.provider);
  }
};

const normalizeGeminiModelName = (model: string): string => {
  if (model.startsWith('models/')) {
    return model;
  }

  return `models/${model}`;
};

export const createGeminiCachedContent = async (params: {
  apiKey: string;
  model: string;
  sharedContextPrompt: string;
  ttlSeconds?: number;
}): Promise<string | null> => {
  const ttlSeconds = Math.max(params.ttlSeconds ?? DEFAULT_GEMINI_CACHE_TTL_SECONDS, 30);

  try {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });
    const cache = await ai.caches.create({
      model: normalizeGeminiModelName(params.model),
      config: {
        displayName: 'resume-adaptation-shared-context',
        contents: params.sharedContextPrompt,
        systemInstruction: SHARED_CONTEXT_SYSTEM_PROMPT,
        ttl: `${ttlSeconds}s`
      }
    });

    return cache.name ?? null;
  } catch (error) {
    console.warn(
      'Failed to create Gemini cached content. Scoring will continue without explicit cache:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
};

export const createGeminiCachedProviderOptions = (
  model: string,
  cachedContent: string
): Record<string, Record<string, unknown>> => {
  const adapter = createGeminiAdapter(model);
  const googleOptions = adapter.toProviderOptions({
    enabled: true,
    scope: 'developer-content',
    ttl: '5m',
    cachedContent
  });

  return {
    google: { ...googleOptions }
  };
};
