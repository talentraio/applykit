import type { ILLMProvider, LLMRequest, LLMResponse } from '../types'
import OpenAI from 'openai'
import { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from '../types'

/**
 * OpenAI Provider
 *
 * Implements LLM provider interface for OpenAI API
 * Supports GPT-4o, GPT-4-turbo, GPT-3.5-turbo models
 *
 * Pricing (as of 2024):
 * - gpt-4o: $5/1M input tokens, $15/1M output tokens
 * - gpt-4-turbo: $10/1M input tokens, $30/1M output tokens
 * - gpt-3.5-turbo: $0.50/1M input tokens, $1.50/1M output tokens
 *
 * Related: T047, TX021
 */

/**
 * OpenAI model pricing (per 1M tokens)
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
}

/**
 * Default model to use
 */
const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * OpenAI LLM Provider Implementation
 */
export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai' as const

  /**
   * Validate OpenAI API key
   * Makes a minimal API call to verify the key works
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey })

      // Make minimal API call to verify key
      await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })

      return true
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        return false
      }
      // Other errors might be transient (rate limit, network, etc.)
      // We'll consider the key valid but log the error
      console.warn(`OpenAI key validation failed with non-auth error: ${error}`)
      return true
    }
  }

  /**
   * Call OpenAI API
   */
  async call(
    request: LLMRequest,
    apiKey: string,
    providerType: 'platform' | 'byok'
  ): Promise<LLMResponse> {
    const client = new OpenAI({ apiKey })
    const model = request.model || DEFAULT_MODEL

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
      })

      const content = completion.choices[0]?.message?.content || ''
      const tokensUsed = completion.usage?.total_tokens || 0
      const cost = this.calculateCost(tokensUsed, model)

      return {
        content,
        tokensUsed,
        cost,
        model,
        provider: 'openai',
        providerType
      }
    } catch (error) {
      // Handle specific OpenAI errors
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMAuthError('openai')
      } else if (error instanceof OpenAI.RateLimitError) {
        throw new LLMRateLimitError('openai')
      } else if (error instanceof OpenAI.PermissionDeniedError) {
        throw new LLMQuotaError('openai')
      } else if (error instanceof OpenAI.APIError) {
        throw new LLMError(`OpenAI API error: ${error.message}`, 'openai', error.code || undefined)
      } else {
        throw new LLMError(error instanceof Error ? error.message : 'Unknown error', 'openai')
      }
    }
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return DEFAULT_MODEL
  }

  /**
   * Calculate cost based on token usage
   * Note: This is a simplified calculation assuming 50/50 split between input/output
   * In reality, you'd track input and output tokens separately
   */
  calculateCost(tokensUsed: number, model: string): number {
    const pricing = PRICING[model] || PRICING[DEFAULT_MODEL]

    // Estimate: assume 50% input, 50% output tokens
    const inputTokens = tokensUsed * 0.5
    const outputTokens = tokensUsed * 0.5

    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
  }
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIProvider(): ILLMProvider {
  return new OpenAIProvider()
}
