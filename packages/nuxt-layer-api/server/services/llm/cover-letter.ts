import type {
  CoverLetterGenerationSettings,
  CoverLetterLlmResponse,
  LLMProvider,
  ProviderType,
  ResumeContent,
  Role
} from '@int/schema';
import { CoverLetterLlmResponseSchema, LLM_SCENARIO_KEY_MAP, USER_ROLE_MAP } from '@int/schema';
import { callLLM, LLMError } from './index';
import { COVER_LETTER_SYSTEM_PROMPT, createCoverLetterUserPrompt } from './prompts/cover-letter';

const NON_RECOVERABLE_LLM_ERROR_CODES = new Set([
  'AUTH_ERROR',
  'NO_PLATFORM_KEY',
  'PLATFORM_DISABLED',
  'ROLE_BUDGET_DISABLED',
  'DAILY_BUDGET_EXCEEDED',
  'WEEKLY_BUDGET_EXCEEDED',
  'MONTHLY_BUDGET_EXCEEDED',
  'GLOBAL_BUDGET_EXCEEDED',
  'RATE_LIMIT',
  'QUOTA_EXCEEDED'
]);

const DEFAULT_MAX_RETRIES = 1;

type UsageBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type CoverLetterUsage = {
  cost: number;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  provider: LLMProvider;
  providerType: ProviderType;
  model: string;
  attemptsUsed: number;
};

export type GenerateCoverLetterOptions = {
  userId?: string;
  role?: Role;
  provider?: LLMProvider;
  maxRetries?: number;
};

export type GenerateCoverLetterResult = {
  contentMarkdown: string;
  subjectLine: string | null;
  usage: CoverLetterUsage;
};

export class CoverLetterGenerationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_JSON'
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CoverLetterGenerationError';
  }
}

type GenerationInput = {
  resumeContent: ResumeContent;
  vacancy: {
    company: string;
    jobPosition?: string | null;
    description: string;
  };
  settings: CoverLetterGenerationSettings;
};

function toRole(role?: Role): Role {
  return role ?? USER_ROLE_MAP.PUBLIC;
}

function extractJSON(content: string): string {
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return content.trim();
}

function parseCoverLetterResponse(content: string): CoverLetterLlmResponse {
  const jsonString = extractJSON(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new CoverLetterGenerationError(
      `Failed to parse cover letter JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_JSON',
      { content }
    );
  }

  const validation = CoverLetterLlmResponseSchema.safeParse(parsed);
  if (!validation.success) {
    throw new CoverLetterGenerationError(
      `Cover letter response validation failed: ${validation.error.message}`,
      'VALIDATION_FAILED',
      validation.error.issues
    );
  }

  return {
    contentMarkdown: validation.data.contentMarkdown,
    subjectLine: validation.data.subjectLine ?? null
  };
}

function toUsageBreakdown(
  usage:
    | {
        inputTokens: number;
        outputTokens: number;
        cachedInputTokens?: number;
      }
    | undefined
): UsageBreakdown {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0
  };
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof CoverLetterGenerationError) {
    return error.code === 'INVALID_JSON' || error.code === 'VALIDATION_FAILED';
  }

  if (error instanceof LLMError) {
    if (!error.code) {
      return true;
    }

    return !NON_RECOVERABLE_LLM_ERROR_CODES.has(error.code);
  }

  return true;
}

export async function generateCoverLetterWithLLM(
  input: GenerationInput,
  options: GenerateCoverLetterOptions = {}
): Promise<GenerateCoverLetterResult> {
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const userRole = toRole(options.role);

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const scenarioPhase = attempt === 0 ? 'primary' : 'retry';

    try {
      const llmResponse = await callLLM(
        {
          systemMessage: COVER_LETTER_SYSTEM_PROMPT,
          prompt: createCoverLetterUserPrompt({
            resumeContent: input.resumeContent,
            vacancy: input.vacancy,
            settings: input.settings
          }),
          responseFormat: 'json'
        },
        {
          userId: options.userId,
          role: userRole,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
          scenarioPhase
        }
      );

      const parsed = parseCoverLetterResponse(llmResponse.content);
      const usage = toUsageBreakdown(llmResponse.usage);

      return {
        contentMarkdown: parsed.contentMarkdown,
        subjectLine: parsed.subjectLine ?? null,
        usage: {
          cost: llmResponse.cost,
          tokensUsed: llmResponse.tokensUsed,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          provider: llmResponse.provider,
          providerType: llmResponse.providerType,
          model: llmResponse.model,
          attemptsUsed: attempt + 1
        }
      };
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt >= maxRetries) {
        break;
      }
    }
  }

  if (lastError instanceof CoverLetterGenerationError) {
    throw lastError;
  }

  if (lastError instanceof Error) {
    throw new CoverLetterGenerationError(lastError.message, 'LLM_ERROR', lastError);
  }

  throw new CoverLetterGenerationError(
    'Cover letter generation failed after all retries',
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}
