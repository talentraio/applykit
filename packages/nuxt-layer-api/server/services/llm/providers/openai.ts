import type { ProviderType } from '@int/schema';
import type { ILLMProvider, LLMRequest, LLMResponse } from '../types';
import { LLM_PROVIDER_MAP } from '@int/schema';
import OpenAI from 'openai';
import { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from '../types';

/**
 * OpenAI Provider
 *
 * Implements LLM provider interface for OpenAI API
 * Supports GPT-4.1, GPT-4o, GPT-4o mini models
 *
 * Pricing (as of early 2026, standard input/output rates):
 * - gpt-4.1: $2.00/1M input tokens, $8.00/1M output tokens
 * - gpt-4.1-mini: $0.40/1M input tokens, $1.60/1M output tokens
 * - gpt-4.1-nano: $0.10/1M input tokens, $0.40/1M output tokens
 * - gpt-4o: $2.50/1M input tokens, $10.00/1M output tokens
 * - gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 *
 * Related: T047, TX021
 */

/**
 * OpenAI model pricing (per 1M tokens, standard rates)
 * Note: cached input and Batch API discounts are not accounted for here.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-2025-04-14': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-mini-2025-04-14': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4.1-nano-2025-04-14': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-11-20': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-08-06': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-05-13': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.6 }
};

/**
 * Default model to use
 */
const DEFAULT_MODEL = 'gpt-4.1-mini';

/**
 * OpenAI LLM Provider Implementation
 */
export class OpenAIProvider implements ILLMProvider {
  readonly name = LLM_PROVIDER_MAP.OPENAI;

  /**
   * Validate OpenAI API key
   * Makes a minimal API call to verify the key works
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });

      // Make minimal API call to verify key
      await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });

      return true;
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        return false;
      }
      // Other errors might be transient (rate limit, network, etc.)
      // We'll consider the key valid but log the error
      console.warn(`OpenAI key validation failed with non-auth error: ${error}`);
      return true;
    }
  }

  /**
   * Call OpenAI API
   */
  async call(
    request: LLMRequest,
    apiKey: string,
    providerType: ProviderType
  ): Promise<LLMResponse> {
    const client = new OpenAI({ apiKey });
    const model = request.model || DEFAULT_MODEL;

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          ...(request.systemMessage
            ? [{ role: 'system' as const, content: request.systemMessage }]
            : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, model);

      return {
        content,
        tokensUsed,
        cost,
        model,
        provider: LLM_PROVIDER_MAP.OPENAI,
        providerType
      };
    } catch (error) {
      // Handle specific OpenAI errors
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAuthError(LLM_PROVIDER_MAP.OPENAI);
      } else if (error instanceof OpenAI.RateLimitError) {
        throw new LLMRateLimitError(LLM_PROVIDER_MAP.OPENAI);
      } else if (error instanceof OpenAI.PermissionDeniedError) {
        throw new LLMQuotaError(LLM_PROVIDER_MAP.OPENAI);
      } else if (error instanceof OpenAI.APIError) {
        throw new LLMError(
          `OpenAI API error: ${error.message}`,
          LLM_PROVIDER_MAP.OPENAI,
          error.code || undefined
        );
      } else {
        throw new LLMError(
          error instanceof Error ? error.message : 'Unknown error',
          LLM_PROVIDER_MAP.OPENAI
        );
      }
    }
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  /**
   * Calculate cost based on token usage
   * Note: This is a simplified calculation assuming 50/50 split between input/output
   * In reality, you'd track input and output tokens separately
   */
  calculateCost(tokensUsed: number, model: string): number {
    const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];

    if (!pricing) {
      return 0;
    }

    // Estimate: assume 50% input, 50% output tokens
    const inputTokens = tokensUsed * 0.5;
    const outputTokens = tokensUsed * 0.5;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIProvider(): ILLMProvider {
  return new OpenAIProvider();
}
