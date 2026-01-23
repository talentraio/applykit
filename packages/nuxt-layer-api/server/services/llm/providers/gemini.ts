import { GoogleGenAI } from '@google/genai'
import type { ILLMProvider, LLMRequest, LLMResponse } from '../types'
import { LLMError, LLMAuthError, LLMRateLimitError, LLMQuotaError, sanitizeApiKey } from '../types'

/**
 * Gemini Provider
 *
 * Implements LLM provider interface for Google Gemini API
 * Supports Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash models
 *
 * Pricing (as of 2024):
 * - gemini-2.0-flash: $0.10/1M input tokens, $0.40/1M output tokens
 * - gemini-1.5-flash: $0.075/1M input tokens, $0.30/1M output tokens
 * - gemini-1.5-pro: $1.25/1M input tokens, $5.00/1M output tokens
 *
 * Related: T048, TX021
 */

/**
 * Gemini model pricing (per 1M tokens)
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
}

/**
 * Default model to use
 */
const DEFAULT_MODEL = 'gemini-2.0-flash'

/**
 * Gemini LLM Provider Implementation
 */
export class GeminiProvider implements ILLMProvider {
  readonly name = 'gemini' as const

  /**
   * Validate Gemini API key
   * Makes a minimal API call to verify the key works
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey })

      // Make minimal API call to verify key
      await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: 'test',
      })

      return true
    }
    catch (error: any) {
      // Check for authentication errors
      if (error?.status === 401 || error?.status === 403) {
        return false
      }
      // Other errors might be transient
      console.warn(`Gemini key validation failed with non-auth error: ${error}`)
      return true
    }
  }

  /**
   * Call Gemini API
   */
  async call(
    request: LLMRequest,
    apiKey: string,
    providerType: 'platform' | 'byok',
  ): Promise<LLMResponse> {
    const ai = new GoogleGenAI({ apiKey })
    const model = request.model || DEFAULT_MODEL

    try {
      // Build the prompt with system message if provided
      let contents = request.prompt
      if (request.systemMessage) {
        contents = `${request.systemMessage}\n\n${request.prompt}`
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
        },
      })

      const content = response.text || ''

      // Note: Gemini API doesn't always return token usage in basic responses
      // We'll estimate based on content length if not available
      const tokensUsed = this.estimateTokens(contents, content)
      const cost = this.calculateCost(tokensUsed, model)

      return {
        content,
        tokensUsed,
        cost,
        model,
        provider: 'gemini',
        providerType,
      }
    }
    catch (error: any) {
      // Handle specific Gemini errors based on status code
      const status = error?.status
      const message = error?.message || 'Unknown error'

      if (status === 401 || status === 403) {
        throw new LLMAuthError('gemini')
      }
      else if (status === 429) {
        throw new LLMRateLimitError('gemini')
      }
      else if (status === 400 && message.includes('quota')) {
        throw new LLMQuotaError('gemini')
      }
      else {
        throw new LLMError(
          `Gemini API error: ${message}`,
          'gemini',
          status?.toString(),
        )
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

  /**
   * Estimate tokens based on character count
   * Rough approximation: 1 token ≈ 4 characters
   * This is used when the API doesn't return token usage
   */
  private estimateTokens(input: string, output: string): number {
    const totalChars = input.length + output.length
    return Math.ceil(totalChars / 4)
  }
}

/**
 * Create Gemini provider instance
 */
export function createGeminiProvider(): ILLMProvider {
  return new GeminiProvider()
}
