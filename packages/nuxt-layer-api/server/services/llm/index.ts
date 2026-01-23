import type { LLMProvider } from '@int/schema'
import type { ILLMProvider, LLMRequest, LLMResponse } from './types'
import process from 'node:process'
import { systemConfigRepository } from '../../data/repositories'
import { createGeminiProvider } from './providers/gemini'
import { createOpenAIProvider } from './providers/openai'
import { getKeyHint, LLMError, sanitizeApiKey } from './types'

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
const providers: Map<LLMProvider, ILLMProvider> = new Map()

/**
 * Initialize provider registry
 */
const initProviders = (): void => {
  if (providers.size === 0) {
    providers.set('openai', createOpenAIProvider())
    providers.set('gemini', createGeminiProvider())
  }
}

/**
 * Get provider instance
 */
export function getProvider(provider: LLMProvider): ILLMProvider {
  initProviders()

  const instance = providers.get(provider)
  if (!instance) {
    throw new LLMError(`Unknown provider: ${provider}`, provider)
  }

  return instance
}

/**
 * Get platform API key for provider from environment
 */
function getPlatformKey(provider: LLMProvider): string | undefined {
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY
  } else if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY
  }
  return undefined
}

/**
 * Validate API key for a provider
 *
 * @param provider - LLM provider (openai, gemini)
 * @param apiKey - API key to validate
 * @returns true if valid, false otherwise
 */
export async function validateKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
  const providerInstance = getProvider(provider)
  return await providerInstance.validateKey(apiKey)
}

/**
 * Call LLM with automatic provider selection
 *
 * @param request - LLM request configuration
 * @param options - Service options
 * @param options.userApiKey - User-provided API key (BYOK)
 * @param options.provider - Preferred provider
 * @param options.forcePlatform - Force platform key usage (for testing)
 * @returns LLM response
 */
export async function callLLM(
  request: LLMRequest,
  options?: {
    /**
     * User-provided API key (BYOK)
     */
    userApiKey?: string

    /**
     * Preferred provider
     */
    provider?: LLMProvider

    /**
     * Force platform key usage (for testing)
     */
    forcePlatform?: boolean
  }
): Promise<LLMResponse> {
  // Determine provider and key
  let provider: LLMProvider
  let apiKey: string
  let providerType: 'platform' | 'byok'

  if (options?.userApiKey && !options?.forcePlatform) {
    // BYOK: User provided their own key
    provider = options.provider || 'openai'
    apiKey = options.userApiKey
    providerType = 'byok'
  } else {
    // Platform: Use system configuration
    const config = await systemConfigRepository.canUsePlatformLLM()

    if (!config.allowed) {
      throw new LLMError(
        config.reason || 'Platform LLM is not available',
        'openai',
        'PLATFORM_UNAVAILABLE'
      )
    }

    // Get platform provider preference
    const preferredProvider = await systemConfigRepository.getPlatformProvider()
    provider = options?.provider || preferredProvider

    // Get platform key
    const platformKey = getPlatformKey(provider)
    if (!platformKey) {
      throw new LLMError(`Platform key not configured for ${provider}`, provider, 'NO_PLATFORM_KEY')
    }

    apiKey = platformKey
    providerType = 'platform'
  }

  // Get provider instance and call
  const providerInstance = getProvider(provider)

  try {
    const response = await providerInstance.call(request, apiKey, providerType)

    // If using platform LLM, increment budget
    if (providerType === 'platform') {
      await systemConfigRepository.incrementBudgetUsed(response.cost)
    }

    return response
  } catch (error) {
    // Log error with sanitized key
    console.error(
      `LLM call failed [${provider}, ${providerType}, key: ${sanitizeApiKey(apiKey)}]:`,
      error instanceof Error ? error.message : error
    )
    throw error
  }
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  const providerInstance = getProvider(provider)
  return providerInstance.getDefaultModel()
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
  const providerInstance = getProvider(provider)
  const modelToUse = model || providerInstance.getDefaultModel()
  return providerInstance.calculateCost(tokensUsed, modelToUse)
}

/**
 * Get key hint from full API key
 * Used for storing in database (last 4 characters only)
 */
export { getKeyHint }

/**
 * Sanitize API key for logging
 * Shows only last 4 characters
 */
export { sanitizeApiKey }

// Re-export types
export type { ILLMProvider, LLMRequest, LLMResponse, LLMServiceConfig } from './types'

export { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from './types'
