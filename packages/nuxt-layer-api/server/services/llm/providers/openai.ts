import type { ProviderType } from '@int/schema';
import type { ILLMProvider, LLMRequest, LLMResponse } from '../types';
import { LLM_PROVIDER_MAP } from '@int/schema';
import OpenAI from 'openai';
import { LLMAuthError, LLMError, LLMQuotaError, LLMRateLimitError } from '../types';

/**
 * OpenAI provider.
 *
 * Model resolution order:
 * 1) Explicit `request.model`
 * 2) `runtimeConfig.llm.fallbackLlmModel` when provider is `openai`
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

  if (fallbackConfig?.provider !== LLM_PROVIDER_MAP.OPENAI) {
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
    'No OpenAI model configured. Set llm.fallbackLlmModel or pass request.model.',
    LLM_PROVIDER_MAP.OPENAI,
    'NO_MODEL_CONFIGURED'
  );
};

/**
 * OpenAI LLM Provider Implementation
 */
export class OpenAIProvider implements ILLMProvider {
  readonly name = LLM_PROVIDER_MAP.OPENAI;

  /**
   * Validate OpenAI API key
   * Makes a minimal API call with resolved model to verify the key works.
   */
  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      const model = resolveModel();

      // Make minimal API call to verify key
      await client.chat.completions.create({
        model,
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
   * Call OpenAI chat completions API.
   */
  async call(
    request: LLMRequest,
    apiKey: string,
    providerType: ProviderType
  ): Promise<LLMResponse> {
    const client = new OpenAI({ apiKey });
    const model = resolveModel(request.model);
    const responseFormat =
      request.responseFormat === 'json' ? ({ type: 'json_object' } as const) : undefined;
    const tokenLimitField =
      model.startsWith('gpt-5') && request.maxTokens !== undefined
        ? { max_completion_tokens: request.maxTokens }
        : { max_tokens: request.maxTokens };
    const temperatureField = model.startsWith('gpt-5')
      ? {}
      : { temperature: request.temperature ?? 0.7 };

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          ...(request.systemMessage
            ? [{ role: 'system' as const, content: request.systemMessage }]
            : []),
          { role: 'user', content: request.prompt }
        ],
        ...temperatureField,
        ...tokenLimitField,
        response_format: responseFormat
      });

      const content = completion.choices[0]?.message?.content || '';
      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const cachedInputTokens = completion.usage?.prompt_tokens_details?.cached_tokens ?? undefined;
      const tokensUsed = completion.usage?.total_tokens ?? inputTokens + outputTokens;
      const cost = this.calculateCost(tokensUsed, model);

      return {
        content,
        tokensUsed,
        cost,
        model,
        provider: LLM_PROVIDER_MAP.OPENAI,
        providerType,
        usage: {
          inputTokens,
          outputTokens,
          cachedInputTokens
        }
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
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIProvider(): ILLMProvider {
  return new OpenAIProvider();
}
