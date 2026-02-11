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

    return {
      prompt,
      cacheTokenEstimate: cacheManager.getTotalTokens()
    };
  } catch (error) {
    console.warn(
      'Failed to build Mullion shared context, using fallback prompt payload:',
      error instanceof Error ? error.message : error
    );

    return buildFallbackSharedPrompt(payload);
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
