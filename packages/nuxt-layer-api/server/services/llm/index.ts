import type { LLMProvider, LlmScenarioKey, Role } from '@int/schema';
import type { ILLMProvider, LLMRequest, LLMResponse } from './types';
import {
  LLM_PROVIDER_MAP,
  LLM_PROVIDER_VALUES,
  PROVIDER_TYPE_MAP,
  USER_ROLE_MAP
} from '@int/schema';
import { startOfDay } from 'date-fns';
import {
  roleBudgetWindowRepository,
  roleSettingsRepository,
  systemConfigRepository,
  usageLogRepository
} from '../../data/repositories';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAIProvider } from './providers/openai';
import { resolveScenarioModel } from './routing';
import { getKeyHint, LLMError, sanitizeApiKey } from './types';

/**
 * LLM Service Factory
 *
 * Manages provider selection and platform budget checks.
 * Execution path is platform-only.
 */

const providers: Map<LLMProvider, ILLMProvider> = new Map();

const initProviders = (): void => {
  if (providers.size === 0) {
    providers.set(LLM_PROVIDER_MAP.OPENAI, createOpenAIProvider());
    providers.set(LLM_PROVIDER_MAP.GEMINI, createGeminiProvider());
  }
};

export type RuntimeFallbackLlmModel = {
  provider: LLMProvider;
  model: string;
  price: {
    input: number;
    output: number;
    cache: number;
  };
};

const DEFAULT_FALLBACK_LLM_MODEL: RuntimeFallbackLlmModel = {
  provider: LLM_PROVIDER_MAP.OPENAI,
  model: 'gpt-4.1-mini',
  price: {
    input: 0.4,
    output: 1.6,
    cache: 0
  }
};

const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
};

export const getFallbackLlmModel = (): RuntimeFallbackLlmModel => {
  const runtimeConfig = useRuntimeConfig();
  const fallbackConfig = runtimeConfig.llm?.fallbackLlmModel;
  const providerCandidate = fallbackConfig?.provider;
  const isProviderSupported =
    typeof providerCandidate === 'string' &&
    (LLM_PROVIDER_VALUES as readonly string[]).includes(providerCandidate);
  const modelCandidate = fallbackConfig?.model;
  const model =
    typeof modelCandidate === 'string' && modelCandidate.trim().length > 0
      ? modelCandidate.trim()
      : DEFAULT_FALLBACK_LLM_MODEL.model;

  return {
    provider: isProviderSupported
      ? (providerCandidate as LLMProvider)
      : DEFAULT_FALLBACK_LLM_MODEL.provider,
    model,
    price: {
      input: toNonNegativeNumber(
        fallbackConfig?.price?.input,
        DEFAULT_FALLBACK_LLM_MODEL.price.input
      ),
      output: toNonNegativeNumber(
        fallbackConfig?.price?.output,
        DEFAULT_FALLBACK_LLM_MODEL.price.output
      ),
      cache: toNonNegativeNumber(
        fallbackConfig?.price?.cache,
        DEFAULT_FALLBACK_LLM_MODEL.price.cache
      )
    }
  };
};

export function getProvider(provider: LLMProvider): ILLMProvider {
  initProviders();

  const instance = providers.get(provider);
  if (!instance) {
    throw new LLMError(`Unknown provider: ${provider}`, provider);
  }

  return instance;
}

function getPlatformKey(provider: LLMProvider): string | undefined {
  const runtimeConfig = useRuntimeConfig();

  if (provider === LLM_PROVIDER_MAP.OPENAI) {
    return runtimeConfig.llm?.openaiApiKey;
  }

  if (provider === LLM_PROVIDER_MAP.GEMINI) {
    return runtimeConfig.llm?.geminiApiKey;
  }

  return undefined;
}

type CatalogCostOptions = {
  usage?: LLMResponse['usage'];
  cachedInputPricePer1mUsd?: number | null;
};

/**
 * Estimate cost from model catalog rates.
 *
 * If provider usage split is available, use input/output/cached input token counts.
 * Otherwise fallback to a simple 50/50 input/output approximation by total tokens.
 */
export function calculateCatalogCost(
  tokensUsed: number,
  inputPricePer1mUsd: number,
  outputPricePer1mUsd: number,
  options: CatalogCostOptions = {}
): number {
  const usage = options.usage;
  const inputTokens = usage?.inputTokens;
  const outputTokens = usage?.outputTokens;

  if (
    typeof inputTokens === 'number' &&
    Number.isFinite(inputTokens) &&
    typeof outputTokens === 'number' &&
    Number.isFinite(outputTokens) &&
    (inputTokens > 0 || outputTokens > 0 || tokensUsed === 0)
  ) {
    const safeInputTokens = Math.max(0, inputTokens);
    const safeOutputTokens = Math.max(0, outputTokens);
    const rawCachedInputTokens =
      typeof usage?.cachedInputTokens === 'number' && Number.isFinite(usage.cachedInputTokens)
        ? Math.max(0, usage.cachedInputTokens)
        : 0;
    const cachedInputTokens = Math.min(rawCachedInputTokens, safeInputTokens);
    const regularInputTokens = Math.max(0, safeInputTokens - cachedInputTokens);
    const cachedInputPricePer1mUsd =
      typeof options.cachedInputPricePer1mUsd === 'number' &&
      Number.isFinite(options.cachedInputPricePer1mUsd) &&
      options.cachedInputPricePer1mUsd >= 0
        ? options.cachedInputPricePer1mUsd
        : inputPricePer1mUsd;

    const regularInputCost = (regularInputTokens / 1_000_000) * inputPricePer1mUsd;
    const cachedInputCost = (cachedInputTokens / 1_000_000) * cachedInputPricePer1mUsd;
    const outputCost = (safeOutputTokens / 1_000_000) * outputPricePer1mUsd;

    return regularInputCost + cachedInputCost + outputCost;
  }

  const approximatedInputTokens = tokensUsed * 0.5;
  const approximatedOutputTokens = tokensUsed * 0.5;

  const approximatedInputCost = (approximatedInputTokens / 1_000_000) * inputPricePer1mUsd;
  const approximatedOutputCost = (approximatedOutputTokens / 1_000_000) * outputPricePer1mUsd;

  return approximatedInputCost + approximatedOutputCost;
}

export async function validateKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
  const providerInstance = getProvider(provider);
  return await providerInstance.validateKey(apiKey);
}

/**
 * Call LLM with automatic scenario model/provider resolution.
 */
export async function callLLM(
  request: LLMRequest,
  options?: {
    userId?: string;
    role?: Role;
    provider?: LLMProvider;
    scenario?: LlmScenarioKey;
    scenarioPhase?: 'primary' | 'retry';
    respectRequestMaxTokens?: boolean;
    respectRequestReasoningEffort?: boolean;
  }
): Promise<LLMResponse> {
  const userRole = options?.role ?? USER_ROLE_MAP.PUBLIC;
  const userId = options?.userId;
  const fallbackLlmModel = getFallbackLlmModel();
  const isSuperAdmin = userRole === USER_ROLE_MAP.SUPER_ADMIN;
  const roleSettings = await roleSettingsRepository.getByRole(userRole);

  const platformEnabled = isSuperAdmin || roleSettings.platformLlmEnabled;
  if (!platformEnabled) {
    throw new LLMError(
      'Platform LLM is disabled for this role',
      LLM_PROVIDER_MAP.OPENAI,
      'PLATFORM_DISABLED'
    );
  }

  if (!isSuperAdmin && userId) {
    const now = new Date();
    const budgetChecks: Array<{
      cap: number;
      exceededCode: string;
      exceededMessage: string;
      getWindowStartAt: () => Promise<Date>;
    }> = [
      {
        cap: roleSettings.dailyBudgetCap,
        exceededCode: 'DAILY_BUDGET_EXCEEDED',
        exceededMessage: 'Daily budget cap reached',
        getWindowStartAt: async () => startOfDay(now)
      },
      {
        cap: roleSettings.weeklyBudgetCap,
        exceededCode: 'WEEKLY_BUDGET_EXCEEDED',
        exceededMessage: 'Weekly budget cap reached',
        getWindowStartAt: async () => {
          const weeklyWindow = await roleBudgetWindowRepository.getActiveWindow(
            userId,
            userRole,
            'weekly',
            now
          );

          return weeklyWindow.windowStartAt;
        }
      },
      {
        cap: roleSettings.monthlyBudgetCap,
        exceededCode: 'MONTHLY_BUDGET_EXCEEDED',
        exceededMessage: 'Monthly budget cap reached',
        getWindowStartAt: async () => {
          const monthlyWindow = await roleBudgetWindowRepository.getActiveWindow(
            userId,
            userRole,
            'monthly',
            now
          );

          return monthlyWindow.windowStartAt;
        }
      }
    ].filter(item => item.cap > 0);

    if (budgetChecks.length === 0) {
      throw new LLMError(
        'Role budget caps are not configured',
        LLM_PROVIDER_MAP.OPENAI,
        'ROLE_BUDGET_DISABLED'
      );
    }

    for (const check of budgetChecks) {
      const windowStartAt = await check.getWindowStartAt();
      const periodUsage = await usageLogRepository.getCostByProviderSince(
        userId,
        PROVIDER_TYPE_MAP.PLATFORM,
        windowStartAt
      );

      if (periodUsage >= check.cap) {
        throw new LLMError(check.exceededMessage, LLM_PROVIDER_MAP.OPENAI, check.exceededCode);
      }
    }
  }

  const globalBudget = await systemConfigRepository.canUseGlobalBudget();
  if (!globalBudget.allowed) {
    throw new LLMError(
      globalBudget.reason || 'Global budget cap reached',
      LLM_PROVIDER_MAP.OPENAI,
      'GLOBAL_BUDGET_EXCEEDED'
    );
  }

  let scenarioModel: Awaited<ReturnType<typeof resolveScenarioModel>> = null;

  if (options?.scenario) {
    try {
      scenarioModel = await resolveScenarioModel(userRole, options.scenario);
    } catch (error) {
      console.warn(
        `Failed to resolve scenario model (${options.scenario}), using runtime fallback model:`,
        error instanceof Error ? error.message : error
      );
      scenarioModel = null;
    }
  }

  const scenarioPhase = options?.scenarioPhase ?? 'primary';
  const scenarioPhaseModel = scenarioModel
    ? scenarioPhase === 'retry'
      ? (scenarioModel.retry ?? scenarioModel.primary)
      : scenarioModel.primary
    : null;
  const useFallbackModel = Boolean(options?.scenario) && !scenarioPhaseModel;
  const provider = useFallbackModel
    ? fallbackLlmModel.provider
    : (scenarioPhaseModel?.provider ?? options?.provider ?? fallbackLlmModel.provider);
  const modelFromFallbackProvider =
    provider === fallbackLlmModel.provider ? fallbackLlmModel.model : undefined;

  const apiKey = getPlatformKey(provider);
  if (!apiKey) {
    throw new LLMError(`Platform key not configured for ${provider}`, provider, 'NO_PLATFORM_KEY');
  }

  const providerInstance = getProvider(provider);

  const mergedRequest: LLMRequest = {
    ...request,
    model: useFallbackModel
      ? fallbackLlmModel.model
      : (scenarioPhaseModel?.model ?? request.model ?? modelFromFallbackProvider),
    temperature: scenarioModel?.temperature ?? request.temperature,
    maxTokens:
      options?.respectRequestMaxTokens && request.maxTokens !== undefined
        ? request.maxTokens
        : (scenarioModel?.maxTokens ?? request.maxTokens),
    responseFormat: scenarioModel?.responseFormat ?? request.responseFormat,
    reasoningEffort:
      options?.respectRequestReasoningEffort && request.reasoningEffort !== undefined
        ? request.reasoningEffort
        : (scenarioModel?.reasoningEffort ?? request.reasoningEffort)
  };

  try {
    const response = await providerInstance.call(mergedRequest, apiKey, PROVIDER_TYPE_MAP.PLATFORM);

    const resolvedCost = scenarioPhaseModel
      ? calculateCatalogCost(
          response.tokensUsed,
          scenarioPhaseModel.inputPricePer1mUsd,
          scenarioPhaseModel.outputPricePer1mUsd,
          {
            usage: response.usage,
            cachedInputPricePer1mUsd: scenarioPhaseModel.cachedInputPricePer1mUsd
          }
        )
      : useFallbackModel
        ? calculateCatalogCost(
            response.tokensUsed,
            fallbackLlmModel.price.input,
            fallbackLlmModel.price.output,
            {
              usage: response.usage,
              cachedInputPricePer1mUsd: fallbackLlmModel.price.cache
            }
          )
        : response.cost;

    await systemConfigRepository.incrementBudgetUsed(resolvedCost);

    return {
      ...response,
      cost: resolvedCost,
      providerType: PROVIDER_TYPE_MAP.PLATFORM
    };
  } catch (error) {
    console.error(
      `LLM call failed [${provider}, ${PROVIDER_TYPE_MAP.PLATFORM}, key: ${sanitizeApiKey(apiKey)}]:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

export function getDefaultModel(provider: LLMProvider): string {
  const providerInstance = getProvider(provider);
  return providerInstance.getDefaultModel();
}

export function calculateCost(provider: LLMProvider, tokensUsed: number, model?: string): number {
  const providerInstance = getProvider(provider);
  const modelToUse = model || providerInstance.getDefaultModel();
  return providerInstance.calculateCost(tokensUsed, modelToUse);
}

export { getKeyHint };

export { sanitizeApiKey };

export { resolveScenarioModel } from './routing';

export type { ILLMProvider, LLMRequest, LLMResponse, LLMServiceConfig } from './types';

export { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from './types';
