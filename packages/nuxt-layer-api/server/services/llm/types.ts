import type { LLMProvider, ProviderType } from '@int/schema';

/**
 * LLM Service Types
 *
 * Defines interfaces for LLM providers and service configuration
 * Supports OpenAI and Gemini with platform-managed keys
 *
 * Related: T046-T049, TX021
 */

/**
 * LLM request configuration
 */
export type LLMRequest = {
  /**
   * The prompt/messages to send to the LLM
   */
  prompt: string;

  /**
   * System message (optional)
   */
  systemMessage?: string;

  /**
   * Temperature (0-1, default: 0.7)
   * Higher = more creative, Lower = more focused
   */
  temperature?: number;

  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;

  /**
   * Model to use (provider-specific)
   */
  model?: string;

  /**
   * Desired response format
   * - text: regular free-form output
   * - json: force JSON object output when provider supports it
   */
  responseFormat?: 'text' | 'json';
};

/**
 * LLM response
 */
export type LLMResponse = {
  /**
   * Generated content
   */
  content: string;

  /**
   * Tokens used in this request
   */
  tokensUsed: number;

  /**
   * Estimated cost in USD
   */
  cost: number;

  /**
   * Model that was used
   */
  model: string;

  /**
   * Provider that processed the request
   */
  provider: LLMProvider;

  /**
   * Provider type used for execution (platform-managed path)
   */
  providerType: ProviderType;
};

/**
 * LLM Provider Interface
 *
 * All LLM providers must implement this interface
 */
export type ILLMProvider = {
  /**
   * Provider name (openai, gemini)
   */
  readonly name: LLMProvider;

  /**
   * Validate API key
   * Makes a minimal API call to verify the key works
   *
   * @param apiKey - API key to validate
   * @returns true if valid, false otherwise
   */
  validateKey: (apiKey: string) => Promise<boolean>;

  /**
   * Call the LLM with a request
   *
   * @param request - LLM request configuration
   * @param apiKey - Platform API key
   * @param providerType - Provider source marker for usage logs
   * @returns LLM response with content and usage
   */
  call: (request: LLMRequest, apiKey: string, providerType: ProviderType) => Promise<LLMResponse>;

  /**
   * Get default model for this provider
   */
  getDefaultModel: () => string;

  /**
   * Calculate estimated cost for a request
   *
   * @param tokensUsed - Total tokens (input + output)
   * @param model - Model used
   * @returns Cost in USD
   */
  calculateCost: (tokensUsed: number, model: string) => number;
};

/**
 * LLM Service Configuration
 */
export type LLMServiceConfig = {
  /**
   * Preferred provider (openai or gemini)
   */
  preferredProvider?: LLMProvider;

  /**
   * Platform API keys (from environment)
   */
  platformKeys?: {
    openai?: string;
    gemini?: string;
  };

  /**
   * Default temperature
   */
  defaultTemperature?: number;

  /**
   * Default max tokens
   */
  defaultMaxTokens?: number;

  /**
   * Enable request logging (for debugging)
   * CRITICAL: Never log full API keys
   */
  enableLogging?: boolean;
};

/**
 * LLM Error Types
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public code?: string
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMAuthError extends LLMError {
  constructor(provider: LLMProvider) {
    super('Invalid API key', provider, 'AUTH_ERROR');
    this.name = 'LLMAuthError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(provider: LLMProvider) {
    super('Rate limit exceeded', provider, 'RATE_LIMIT');
    this.name = 'LLMRateLimitError';
  }
}

export class LLMQuotaError extends LLMError {
  constructor(provider: LLMProvider) {
    super('Quota exceeded', provider, 'QUOTA_EXCEEDED');
    this.name = 'LLMQuotaError';
  }
}

/**
 * Sanitize API key for logging
 * Shows only last 4 characters
 *
 * @param apiKey - Full API key
 * @returns Sanitized key (e.g., "****wxyz")
 */
export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }
  const last4 = apiKey.slice(-4);
  return `****${last4}`;
}

/**
 * Extract key hint (last 4 characters)
 *
 * @param apiKey - Full API key
 * @returns Last 4 characters
 */
export function getKeyHint(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '';
  }
  return apiKey.slice(-4);
}
