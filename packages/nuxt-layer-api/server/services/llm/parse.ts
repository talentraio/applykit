import { ResumeContentSchema, type ResumeContent } from '@int/schema'
import type { LLMProvider } from '@int/schema'
import { callLLM, LLMError } from './index'
import { PARSE_SYSTEM_PROMPT, createParseUserPrompt } from './prompts/parse'

/**
 * LLM Parse Service
 *
 * Parses resume text into structured JSON using LLM
 * Includes Zod validation and automatic retry on validation failure
 *
 * Related: T072 (US2)
 */

/**
 * Parse options
 */
export interface ParseOptions {
  /**
   * User-provided API key (BYOK)
   */
  userApiKey?: string

  /**
   * Preferred provider
   */
  provider?: LLMProvider

  /**
   * Maximum retry attempts (default: 2)
   */
  maxRetries?: number

  /**
   * Temperature for LLM (default: 0.1 for deterministic parsing)
   */
  temperature?: number
}

/**
 * Parse result
 */
export interface ParseLLMResult {
  content: ResumeContent
  cost: number
  tokensUsed: number
  provider: LLMProvider
  attemptsUsed: number
}

/**
 * Parse error class
 */
export class ParseLLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR'
      | 'INVALID_JSON',
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ParseLLMError'
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
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0].trim()
  }

  return text.trim()
}

/**
 * Parse resume text into structured content using LLM
 *
 * @param text - Plain text extracted from resume document
 * @param options - Parse options
 * @returns Parsed resume content with metadata
 * @throws ParseLLMError if parsing fails after retries
 */
export async function parseResumeWithLLM(
  text: string,
  options: ParseOptions = {},
): Promise<ParseLLMResult> {
  const {
    userApiKey,
    provider,
    maxRetries = 2,
    temperature = 0.1,
  } = options

  let attempts = 0
  let totalCost = 0
  let totalTokens = 0
  let lastError: Error | null = null
  let actualProvider: LLMProvider | undefined

  while (attempts < maxRetries) {
    attempts++

    try {
      // Call LLM
      const response = await callLLM(
        {
          messages: [
            { role: 'system', content: PARSE_SYSTEM_PROMPT },
            { role: 'user', content: createParseUserPrompt(text) },
          ],
          temperature,
          maxTokens: 4000,
        },
        {
          userApiKey,
          provider,
        },
      )

      actualProvider = response.provider
      totalCost += response.cost
      totalTokens += response.tokensUsed

      // Extract JSON from response
      const jsonString = extractJSON(response.content)

      // Parse JSON
      let parsedJSON: unknown
      try {
        parsedJSON = JSON.parse(jsonString)
      }
      catch (jsonError) {
        throw new ParseLLMError(
          `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
          'INVALID_JSON',
          { response: response.content },
        )
      }

      // Validate with Zod
      const validationResult = ResumeContentSchema.safeParse(parsedJSON)

      if (validationResult.success) {
        // Success!
        return {
          content: validationResult.data,
          cost: totalCost,
          tokensUsed: totalTokens,
          provider: actualProvider,
          attemptsUsed: attempts,
        }
      }

      // Validation failed
      lastError = new ParseLLMError(
        `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
        'VALIDATION_FAILED',
        validationResult.error.errors,
      )

      console.warn(
        `Parse validation failed (attempt ${attempts}/${maxRetries}):`,
        validationResult.error.errors,
      )

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError
      }

      // Otherwise, retry with more specific instructions
      // (Could enhance this to include validation errors in the prompt)
    }
    catch (error) {
      if (error instanceof ParseLLMError) {
        lastError = error
      }
      else if (error instanceof LLMError) {
        throw new ParseLLMError(
          `LLM error: ${error.message}`,
          'LLM_ERROR',
          error,
        )
      }
      else {
        lastError = new ParseLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error,
        )
      }

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError
      }

      console.warn(
        `Parse attempt ${attempts}/${maxRetries} failed:`,
        lastError.message,
      )
    }
  }

  // Should not reach here, but just in case
  throw new ParseLLMError(
    `Failed to parse resume after ${attempts} attempts: ${lastError?.message || 'Unknown error'}`,
    'MAX_RETRIES_EXCEEDED',
    lastError,
  )
}
