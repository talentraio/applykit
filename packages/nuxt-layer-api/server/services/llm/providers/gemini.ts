import type { ProviderType } from '@int/schema';
import type { ILLMProvider, LLMRequest, LLMResponse } from '../types';
import { GoogleGenAI } from '@google/genai';
import { LLM_PROVIDER_MAP } from '@int/schema';
import { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from '../types';

/**
 * Gemini provider.
 *
 * Model resolution order:
 * 1) Explicit `request.model`
 * 2) `runtimeConfig.llm.fallbackLlmModel` when provider is `gemini`
 *
 * Cost estimation uses fallback model input/output prices from runtime config.
 */

type FallbackModelConfig = {
  model: string;
  price: {
    input: number;
    output: number;
  };
};

const toNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
};

const getFallbackModelConfig = (): FallbackModelConfig | null => {
  const runtimeConfig = useRuntimeConfig();
  const fallbackConfig = runtimeConfig.llm?.fallbackLlmModel;

  if (fallbackConfig?.provider !== LLM_PROVIDER_MAP.GEMINI) {
    return null;
  }

  if (typeof fallbackConfig.model !== 'string' || fallbackConfig.model.trim().length === 0) {
    return null;
  }

  const input = toNonNegativeNumber(fallbackConfig.price?.input);
  const output = toNonNegativeNumber(fallbackConfig.price?.output);

  if (input === null || output === null) {
    return null;
  }

  return {
    model: fallbackConfig.model.trim(),
    price: {
      input,
      output
    }
  };
};

const resolveModel = (requestedModel?: string): string => {
  if (typeof requestedModel === 'string' && requestedModel.trim().length > 0) {
    return requestedModel.trim();
  }

  const fallbackModel = getFallbackModelConfig();
  if (fallbackModel) {
    return fallbackModel.model;
  }

  throw new LLMError(
    'No Gemini model configured. Set llm.fallbackLlmModel or pass request.model.',
    LLM_PROVIDER_MAP.GEMINI,
    'NO_MODEL_CONFIGURED'
  );
};

/**
 * Gemini LLM Provider Implementation
 */
export class GeminiProvider implements ILLMProvider {
  readonly name = LLM_PROVIDER_MAP.GEMINI;

  /**
   * Validate Gemini API key
   * Makes a minimal API call with resolved model to verify the key works.
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = resolveModel();

      // Make minimal API call to verify key
      await ai.models.generateContent({
        model,
        contents: 'test'
      });

      return true;
    } catch (error: any) {
      // Check for authentication errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      // Other errors might be transient
      console.warn(`Gemini key validation failed with non-auth error: ${error}`);
      return true;
    }
  }

  /**
   * Call Gemini API.
   */
  async call(
    request: LLMRequest,
    apiKey: string,
    providerType: ProviderType
  ): Promise<LLMResponse> {
    const ai = new GoogleGenAI({ apiKey });
    const model = resolveModel(request.model);

    try {
      // Build the prompt with system message if provided
      let contents = request.prompt;
      if (request.systemMessage) {
        contents = `${request.systemMessage}\n\n${request.prompt}`;
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined
        }
      });

      const content = response.text || '';

      // Note: Gemini API doesn't always return token usage in basic responses
      // We'll estimate based on content length if not available
      const tokensUsed = this.estimateTokens(contents, content);
      const cost = this.calculateCost(tokensUsed, model);

      return {
        content,
        tokensUsed,
        cost,
        model,
        provider: LLM_PROVIDER_MAP.GEMINI,
        providerType
      };
    } catch (error: any) {
      // Handle specific Gemini errors based on status code
      const status = error?.status;
      const message = error?.message || 'Unknown error';

      if (status === 401 || status === 403) {
        throw new LLMAuthError(LLM_PROVIDER_MAP.GEMINI);
      } else if (status === 429) {
        throw new LLMRateLimitError(LLM_PROVIDER_MAP.GEMINI);
      } else if (status === 400 && message.includes('quota')) {
        throw new LLMQuotaError(LLM_PROVIDER_MAP.GEMINI);
      } else {
        throw new LLMError(
          `Gemini API error: ${message}`,
          LLM_PROVIDER_MAP.GEMINI,
          status?.toString()
        );
      }
    }
  }

  /**
   * Get default model resolved from runtime config.
   */
  getDefaultModel(): string {
    return resolveModel();
  }

  /**
   * Calculate approximate cost based on token usage.
   * Uses fallback model pricing from runtime config.
   */
  calculateCost(tokensUsed: number, _model: string): number {
    const fallbackModel = getFallbackModelConfig();
    if (!fallbackModel) {
      return 0;
    }

    const pricing = fallbackModel.price;

    // Estimate: assume 50% input, 50% output tokens
    const inputTokens = tokensUsed * 0.5;
    const outputTokens = tokensUsed * 0.5;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Estimate tokens based on character count
   * Rough approximation: 1 token ≈ 4 characters
   * This is used when the API doesn't return token usage
   */
  private estimateTokens(input: string, output: string): number {
    const totalChars = input.length + output.length;
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Create Gemini provider instance
 */
export function createGeminiProvider(): ILLMProvider {
  return new GeminiProvider();
}
