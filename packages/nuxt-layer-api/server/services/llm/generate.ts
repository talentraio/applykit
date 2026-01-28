import type { LLMProvider, ResumeContent, Role } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { z } from 'zod';
import { callLLM, LLMError } from './index';
import { createGenerateUserPrompt, GENERATE_SYSTEM_PROMPT } from './prompts/generate';

/**
 * LLM Generate Service
 *
 * Tailors resume to match vacancy using LLM
 * Includes Zod validation and automatic retry on validation failure
 *
 * Related: T105 (US5)
 */

/**
 * Generation LLM response schema
 */
const GenerateLLMResponseSchema = z.object({
  content: ResumeContentSchema,
  matchScoreBefore: z.number().int().min(0).max(100),
  matchScoreAfter: z.number().int().min(0).max(100)
});

/**
 * Generate options
 */
export type GenerateOptions = {
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
   * Maximum retry attempts (default: 2)
   */
  maxRetries?: number;

  /**
   * Temperature for LLM (default: 0.3 for consistent but creative tailoring)
   */
  temperature?: number;
};

/**
 * Generate result
 */
export type GenerateLLMResult = {
  content: ResumeContent;
  matchScoreBefore: number;
  matchScoreAfter: number;
  cost: number;
  tokensUsed: number;
  provider: LLMProvider;
  attemptsUsed: number;
};

/**
 * Generate error class
 */
export class GenerateLLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR'
      | 'INVALID_JSON'
      | 'INVALID_SCORES',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GenerateLLMError';
  }
}

/**
 * Extract JSON from LLM response
 *
 * Handles cases where LLM wraps JSON in markdown code blocks
 *
 * @param text - LLM response text
 * @returns Extracted JSON string
 */
function extractJSON(text: string): string {
  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/**
 * Tailor resume to match vacancy using LLM
 *
 * @param baseResume - Original resume content
 * @param vacancy - Vacancy details
 * @param vacancy.company - Vacancy company name
 * @param vacancy.jobPosition - Vacancy job title or role
 * @param vacancy.description - Vacancy description text
 * @param profile - Optional user profile for additional context
 * @param profile.preferredJobTitle - User's preferred job title
 * @param profile.targetIndustries - User's target industries
 * @param profile.careerGoals - User's career goals
 * @param options - Generation options
 * @returns Tailored resume content with match scores and metadata
 * @throws GenerateLLMError if generation fails after retries
 */
export async function generateResumeWithLLM(
  baseResume: ResumeContent,
  vacancy: {
    company: string;
    jobPosition: string | null;
    description: string;
  },
  profile?: {
    preferredJobTitle?: string | null;
    targetIndustries?: string | null;
    careerGoals?: string | null;
  },
  options: GenerateOptions = {}
): Promise<GenerateLLMResult> {
  const { userId, role, userApiKey, provider, maxRetries = 2, temperature = 0.3 } = options;

  let attempts = 0;
  let totalCost = 0;
  let totalTokens = 0;
  let lastError: Error | null = null;
  let actualProvider: LLMProvider | undefined;

  while (attempts < maxRetries) {
    attempts++;

    try {
      // Call LLM
      const response = await callLLM(
        {
          systemMessage: GENERATE_SYSTEM_PROMPT,
          prompt: createGenerateUserPrompt(baseResume, vacancy, profile),
          temperature,
          maxTokens: 6000 // Larger than parse since we're generating more content
        },
        {
          userId,
          role,
          userApiKey,
          provider
        }
      );

      actualProvider = response.provider;
      totalCost += response.cost;
      totalTokens += response.tokensUsed;

      // Extract JSON from response
      const jsonString = extractJSON(response.content);

      // Parse JSON
      let parsedJSON: unknown;
      try {
        parsedJSON = JSON.parse(jsonString);
      } catch (jsonError) {
        throw new GenerateLLMError(
          `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
          'INVALID_JSON',
          { response: response.content }
        );
      }

      // Validate with Zod
      const validationResult = GenerateLLMResponseSchema.safeParse(parsedJSON);

      if (validationResult.success) {
        const data = validationResult.data;

        // Additional validation: matchScoreAfter should be >= matchScoreBefore
        if (data.matchScoreAfter < data.matchScoreBefore) {
          throw new GenerateLLMError(
            `Invalid scores: matchScoreAfter (${data.matchScoreAfter}) is less than matchScoreBefore (${data.matchScoreBefore})`,
            'INVALID_SCORES',
            { matchScoreBefore: data.matchScoreBefore, matchScoreAfter: data.matchScoreAfter }
          );
        }

        // Success!
        return {
          content: data.content,
          matchScoreBefore: data.matchScoreBefore,
          matchScoreAfter: data.matchScoreAfter,
          cost: totalCost,
          tokensUsed: totalTokens,
          provider: actualProvider,
          attemptsUsed: attempts
        };
      }

      // Validation failed
      lastError = new GenerateLLMError(
        `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
        'VALIDATION_FAILED',
        validationResult.error.errors
      );

      console.warn(
        `Generate validation failed (attempt ${attempts}/${maxRetries}):`,
        validationResult.error.errors
      );

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      // Otherwise, retry
    } catch (error) {
      if (error instanceof GenerateLLMError) {
        lastError = error;
      } else if (error instanceof LLMError) {
        throw new GenerateLLMError(`LLM error: ${error.message}`, 'LLM_ERROR', error);
      } else {
        lastError = new GenerateLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error
        );
      }

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      console.warn(`Generate attempt ${attempts}/${maxRetries} failed:`, lastError.message);
    }
  }

  // Should not reach here, but just in case
  throw new GenerateLLMError(
    `Failed to generate resume after ${attempts} attempts: ${lastError?.message || 'Unknown error'}`,
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}
