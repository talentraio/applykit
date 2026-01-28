import type { LLMProvider, ProviderType, Role } from '@int/schema';
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
import { getKeyHint, LLMError, sanitizeApiKey } from './types';

/**
 * LLM Service Factory
 *
 * Manages LLM providers and handles provider selection logic
 * Supports both platform keys (from environment) and BYOK (user-provided keys)
 *
 * Provider Selection:
 * 1. If user provides BYOK key, use that provider
 * 2. If platform LLM is enabled, use configured platform provider
 * 3. Fall back to system default
 *
 * Related: T049, TX021
 */

/**
 * Provider registry
 */
const providers: Map<LLMProvider, ILLMProvider> = new Map();

/**
 * Initialize provider registry
 */
const initProviders = (): void => {
  if (providers.size === 0) {
    providers.set(LLM_PROVIDER_MAP.OPENAI, createOpenAIProvider());
    providers.set(LLM_PROVIDER_MAP.GEMINI, createGeminiProvider());
  }
};

/**
 * Get provider instance
 */
export function getProvider(provider: LLMProvider): ILLMProvider {
  initProviders();

  const instance = providers.get(provider);
  if (!instance) {
    throw new LLMError(`Unknown provider: ${provider}`, provider);
  }

  return instance;
}

/**
 * Get platform API key for provider from runtime config
 */
function getPlatformKey(provider: LLMProvider): string | undefined {
  const runtimeConfig = useRuntimeConfig();

  if (provider === LLM_PROVIDER_MAP.OPENAI) {
    return runtimeConfig.llm?.openaiApiKey;
  } else if (provider === LLM_PROVIDER_MAP.GEMINI) {
    return runtimeConfig.llm?.geminiApiKey;
  }
  return undefined;
}

/**
 * Validate API key for a provider
 *
 * @param provider - LLM provider (openai, gemini)
 * @param apiKey - API key to validate
 * @returns true if valid, false otherwise
 */
export async function validateKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
  const providerInstance = getProvider(provider);
  return await providerInstance.validateKey(apiKey);
}

/**
 * Call LLM with automatic provider selection
 *
 * @param request - LLM request configuration
 * @param options - Service options
 * @param options.userId - User ID (required for role-based checks)
 * @param options.role - User role (required for role-based checks)
 * @param options.userApiKey - User-provided API key (BYOK)
 * @param options.provider - Preferred provider
 * @param options.forcePlatform - Force platform key usage (for testing)
 * @returns LLM response
 */
export async function callLLM(
  request: LLMRequest,
  options?: {
    /**
     * User ID (required for role-based checks)
     */
    userId?: string;

    /**
     * User role (required for role-based checks)
     */
    role?: Role;

    /**
     * User-provided API key (BYOK)
     */
    userApiKey?: string;

    /**
     * Preferred provider
     */
    provider?: LLMProvider;

    /**
     * Force platform key usage (for testing)
     */
    forcePlatform?: boolean;
  }
): Promise<LLMResponse> {
  // Determine provider and key
  let provider: LLMProvider;
  let apiKey: string;
  let providerType: ProviderType;

  const userRole = options?.role;
  const userId = options?.userId;
  const isSuperAdmin = userRole === USER_ROLE_MAP.SUPER_ADMIN;
  const roleSettings = userRole ? await roleSettingsRepository.getByRole(userRole) : null;

  if (options?.userApiKey && !options?.forcePlatform) {
    // BYOK: User provided their own key
    const resolvedProvider = options.provider || LLM_PROVIDER_MAP.OPENAI;
    const byokEnabled = isSuperAdmin || roleSettings?.byokEnabled;

    if (!byokEnabled) {
      throw new LLMError('BYOK is disabled', resolvedProvider, 'BYOK_DISABLED');
    }

    provider = resolvedProvider;
    apiKey = options.userApiKey;
    providerType = PROVIDER_TYPE_MAP.BYOK;
  } else {
    // Platform: Use system configuration
    const platformEnabled = isSuperAdmin || roleSettings?.platformLlmEnabled;

    if (!platformEnabled) {
      throw new LLMError(
        'Platform LLM is disabled for this role',
        LLM_PROVIDER_MAP.OPENAI,
        'PLATFORM_DISABLED'
      );
    }

    if (!isSuperAdmin && userId) {
      const budgetCap = roleSettings?.dailyBudgetCap ?? 0;
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

    // Get platform provider preference (role-based)
    const preferredProvider = roleSettings?.platformProvider ?? PLATFORM_PROVIDER_MAP.OPENAI;
    // Map gemini_flash to gemini for LLM provider type
    const mappedProvider: LLMProvider =
      preferredProvider === PLATFORM_PROVIDER_MAP.GEMINI_FLASH
        ? LLM_PROVIDER_MAP.GEMINI
        : preferredProvider;
    provider = options?.provider || mappedProvider;

    // Get platform key
    const platformKey = getPlatformKey(provider);
    if (!platformKey) {
      throw new LLMError(
        `Platform key not configured for ${provider}`,
        provider,
        'NO_PLATFORM_KEY'
      );
    }

    apiKey = platformKey;
    providerType = PROVIDER_TYPE_MAP.PLATFORM;
  }

  // Get provider instance and call
  const providerInstance = getProvider(provider);

  try {
    const response = await providerInstance.call(request, apiKey, providerType);

    // If using platform LLM, increment budget
    if (providerType === PROVIDER_TYPE_MAP.PLATFORM) {
      await systemConfigRepository.incrementBudgetUsed(response.cost);
    }

    return response;
  } catch (error) {
    // Log error with sanitized key
    console.error(
      `LLM call failed [${provider}, ${providerType}, key: ${sanitizeApiKey(apiKey)}]:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  const providerInstance = getProvider(provider);
  return providerInstance.getDefaultModel();
}

/**
 * Calculate estimated cost for a request
 *
 * @param provider - LLM provider
 * @param tokensUsed - Total tokens used
 * @param model - Model used (optional, uses default if not provided)
 * @returns Estimated cost in USD
 */
export function calculateCost(provider: LLMProvider, tokensUsed: number, model?: string): number {
  const providerInstance = getProvider(provider);
  const modelToUse = model || providerInstance.getDefaultModel();
  return providerInstance.calculateCost(tokensUsed, modelToUse);
}

/**
 * Get key hint from full API key
 * Used for storing in database (last 4 characters only)
 */
export { getKeyHint };

/**
 * Sanitize API key for logging
 * Shows only last 4 characters
 */
export { sanitizeApiKey };

// Re-export types
export type { ILLMProvider, LLMRequest, LLMResponse, LLMServiceConfig } from './types';

export { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from './types';
