import type { LLMProvider, LlmScenarioKey, Role } from '@int/schema';
import type { ILLMProvider, LLMRequest, LLMResponse } from './types';
import {
  LLM_PROVIDER_MAP,
  PLATFORM_PROVIDER_MAP,
  PROVIDER_TYPE_MAP,
  USER_ROLE_MAP
} from '@int/schema';
import {
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
 * Execution path is platform-only (BYOK removed).
 */

const providers: Map<LLMProvider, ILLMProvider> = new Map();

const initProviders = (): void => {
  if (providers.size === 0) {
    providers.set(LLM_PROVIDER_MAP.OPENAI, createOpenAIProvider());
    providers.set(LLM_PROVIDER_MAP.GEMINI, createGeminiProvider());
  }
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

function mapPlatformProviderToLlmProvider(
  platformProvider: 'openai' | 'gemini_flash'
): LLMProvider {
  return platformProvider === PLATFORM_PROVIDER_MAP.GEMINI_FLASH
    ? LLM_PROVIDER_MAP.GEMINI
    : LLM_PROVIDER_MAP.OPENAI;
}

/**
 * Estimate cost from model catalog rates using a simple 50/50 input/output split.
 */
export function calculateCatalogCost(
  tokensUsed: number,
  inputPricePer1mUsd: number,
  outputPricePer1mUsd: number
): number {
  const inputTokens = tokensUsed * 0.5;
  const outputTokens = tokensUsed * 0.5;

  const inputCost = (inputTokens / 1_000_000) * inputPricePer1mUsd;
  const outputCost = (outputTokens / 1_000_000) * outputPricePer1mUsd;

  return inputCost + outputCost;
}

export async function validateKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
  const providerInstance = getProvider(provider);
  return await providerInstance.validateKey(apiKey);
}

/**
 * Call LLM with automatic platform provider selection.
 */
export async function callLLM(
  request: LLMRequest,
  options?: {
    userId?: string;
    role?: Role;
    provider?: LLMProvider;
    scenario?: LlmScenarioKey;
  }
): Promise<LLMResponse> {
  const userRole = options?.role ?? USER_ROLE_MAP.PUBLIC;
  const userId = options?.userId;
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
    const budgetCap = roleSettings.dailyBudgetCap;
    if (budgetCap <= 0) {
      throw new LLMError(
        'Daily budget cap is not configured',
        LLM_PROVIDER_MAP.OPENAI,
        'DAILY_BUDGET_DISABLED'
      );
    }

    const usedToday = await usageLogRepository.getDailyCostByProvider(
      userId,
      PROVIDER_TYPE_MAP.PLATFORM
    );
    if (usedToday >= budgetCap) {
      throw new LLMError(
        'Daily budget cap reached',
        LLM_PROVIDER_MAP.OPENAI,
        'DAILY_BUDGET_EXCEEDED'
      );
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

  const scenarioModel = options?.scenario
    ? await resolveScenarioModel(userRole, options.scenario)
    : null;

  const defaultProvider = mapPlatformProviderToLlmProvider(roleSettings.platformProvider);
  const provider = scenarioModel?.provider ?? options?.provider ?? defaultProvider;

  const apiKey = getPlatformKey(provider);
  if (!apiKey) {
    throw new LLMError(`Platform key not configured for ${provider}`, provider, 'NO_PLATFORM_KEY');
  }

  const providerInstance = getProvider(provider);

  const mergedRequest: LLMRequest = {
    ...request,
    model: scenarioModel?.model ?? request.model,
    temperature: scenarioModel?.temperature ?? request.temperature,
    maxTokens: scenarioModel?.maxTokens ?? request.maxTokens,
    responseFormat: scenarioModel?.responseFormat ?? request.responseFormat
  };

  try {
    const response = await providerInstance.call(mergedRequest, apiKey, PROVIDER_TYPE_MAP.PLATFORM);

    const resolvedCost = scenarioModel
      ? calculateCatalogCost(
          response.tokensUsed,
          scenarioModel.inputPricePer1mUsd,
          scenarioModel.outputPricePer1mUsd
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
