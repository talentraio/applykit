import type { LLMProvider, ResumeContent, Role } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { callLLM, LLMError } from './index';
import { createParseUserPrompt, PARSE_SYSTEM_PROMPT } from './prompts/parse';

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
export type ParseOptions = {
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
   * Temperature for LLM (default: 0.1 for deterministic parsing)
   */
  temperature?: number;
};

/**
 * Parse result
 */
export type ParseLLMResult = {
  content: ResumeContent;
  cost: number;
  tokensUsed: number;
  provider: LLMProvider;
  attemptsUsed: number;
};

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
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ParseLLMError';
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
 * Normalize date to YYYY-MM format
 *
 * @param date - Date string (may be YYYY or YYYY-MM or various other formats)
 * @returns Normalized date in YYYY-MM format, or null for invalid/present
 */
function normalizeDate(date: unknown): string | null {
  if (date === null || date === undefined) {
    return null;
  }

  if (typeof date !== 'string') {
    return null;
  }

  const trimmed = date.trim().toLowerCase();

  // Handle "present" and similar
  if (trimmed === 'present' || trimmed === 'current' || trimmed === 'now' || trimmed === '') {
    return null;
  }

  // Already in correct format YYYY-MM
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(trimmed)) {
    return trimmed;
  }

  // Just year - add -01
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  // Format: MM/YYYY or M/YYYY
  const mmYYYY = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYYYY && mmYYYY[1] && mmYYYY[2]) {
    const month = mmYYYY[1].padStart(2, '0');
    return `${mmYYYY[2]}-${month}`;
  }

  // Format: YYYY/MM
  const yyyyMM = trimmed.match(/^(\d{4})\/(\d{1,2})$/);
  if (yyyyMM && yyyyMM[1] && yyyyMM[2]) {
    const month = yyyyMM[2].padStart(2, '0');
    return `${yyyyMM[1]}-${month}`;
  }

  // Format: Month YYYY (e.g., "January 2023", "Jan 2023")
  const monthNames: Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sep: '09',
    sept: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12'
  };

  const monthYearMatch = trimmed.match(/^([a-z]+)\s*(?:,\s*)?(\d{4})$/i);
  if (monthYearMatch && monthYearMatch[1] && monthYearMatch[2]) {
    const monthNum = monthNames[monthYearMatch[1].toLowerCase()];
    if (monthNum) {
      return `${monthYearMatch[2]}-${monthNum}`;
    }
  }

  // Format: YYYY Month (e.g., "2023 January")
  const yearMonthMatch = trimmed.match(/^(\d{4})\s+([a-z]+)$/i);
  if (yearMonthMatch && yearMonthMatch[1] && yearMonthMatch[2]) {
    const monthNum = monthNames[yearMonthMatch[2].toLowerCase()];
    if (monthNum) {
      return `${yearMonthMatch[1]}-${monthNum}`;
    }
  }

  // Try to extract year from any format as last resort
  const yearMatch = trimmed.match(/\d{4}/);
  if (yearMatch) {
    return `${yearMatch[0]}-01`;
  }

  return null;
}

/**
 * Normalize skills from various LLM output formats
 *
 * LLM sometimes returns skills as:
 * - Array of strings: ["JavaScript", "TypeScript"]
 * - Array of objects with wrong structure
 *
 * This normalizes to the expected format:
 * [{ type: "Category", skills: ["skill1", "skill2"] }]
 */
function normalizeSkills(skills: unknown): Array<{ type: string; skills: string[] }> {
  if (!Array.isArray(skills)) {
    return [{ type: 'Technical Skills', skills: [] }];
  }

  // Check if already in correct format
  if (
    skills.length > 0 &&
    typeof skills[0] === 'object' &&
    skills[0] !== null &&
    'type' in skills[0] &&
    'skills' in skills[0]
  ) {
    // Already correct format - just validate and return
    return skills.map(group => ({
      type: String((group as { type: unknown }).type || 'Other'),
      skills: Array.isArray((group as { skills: unknown }).skills)
        ? (group as { skills: unknown[] }).skills.map(s => String(s))
        : []
    }));
  }

  // Array of strings - group into a single "Technical Skills" category
  if (skills.length > 0 && typeof skills[0] === 'string') {
    return [
      {
        type: 'Technical Skills',
        skills: skills.map(s => String(s))
      }
    ];
  }

  // Unknown format - return empty
  return [{ type: 'Technical Skills', skills: [] }];
}

/**
 * Normalize LLM response data before validation
 *
 * Fixes common LLM output issues:
 * - Date formats (YYYY -> YYYY-01)
 * - Skills structure (string[] -> SkillGroup[])
 */
function normalizeParsedData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  // Normalize experience dates
  if (Array.isArray(obj.experience)) {
    result.experience = obj.experience.map(exp => {
      if (typeof exp !== 'object' || exp === null) return exp;
      const e = exp as Record<string, unknown>;
      return {
        ...e,
        startDate: normalizeDate(e.startDate) || e.startDate,
        endDate: e.endDate === null || e.endDate === undefined ? null : normalizeDate(e.endDate)
      };
    });
  }

  // Normalize education dates
  if (Array.isArray(obj.education)) {
    result.education = obj.education.map(edu => {
      if (typeof edu !== 'object' || edu === null) return edu;
      const e = edu as Record<string, unknown>;

      // Build normalized education entry
      const normalized: Record<string, unknown> = {
        institution: e.institution,
        degree: e.degree,
        startDate: normalizeDate(e.startDate) || e.startDate
      };

      // Only include optional fields if they have valid values
      if (e.field && typeof e.field === 'string') {
        normalized.field = e.field;
      }

      // endDate: only include if present and not null/present
      if (e.endDate !== null && e.endDate !== undefined) {
        const normalizedEndDate = normalizeDate(e.endDate);
        if (normalizedEndDate) {
          normalized.endDate = normalizedEndDate;
        }
        // If normalizeDate returns null (e.g., "present"), omit endDate entirely
      }
      // If e.endDate is null or undefined, we simply don't include it (optional field)

      return normalized;
    });
  }

  // Normalize certifications dates
  if (Array.isArray(obj.certifications)) {
    result.certifications = obj.certifications.map(cert => {
      if (typeof cert !== 'object' || cert === null) return cert;
      const c = cert as Record<string, unknown>;
      return {
        ...c,
        date: c.date ? normalizeDate(c.date) : undefined
      };
    });
  }

  // Normalize skills structure
  if (obj.skills !== undefined) {
    result.skills = normalizeSkills(obj.skills);
  }

  return result;
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
  options: ParseOptions = {}
): Promise<ParseLLMResult> {
  const { userId, role, userApiKey, provider, maxRetries = 2, temperature = 0.1 } = options;

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
          systemMessage: PARSE_SYSTEM_PROMPT,
          prompt: createParseUserPrompt(text),
          temperature,
          maxTokens: 4000
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
        throw new ParseLLMError(
          `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
          'INVALID_JSON',
          { response: response.content }
        );
      }

      // Normalize data before validation (fixes common LLM output issues)
      const normalizedData = normalizeParsedData(parsedJSON);

      // Validate with Zod
      const validationResult = ResumeContentSchema.safeParse(normalizedData);

      if (validationResult.success) {
        // Success!
        return {
          content: validationResult.data,
          cost: totalCost,
          tokensUsed: totalTokens,
          provider: actualProvider,
          attemptsUsed: attempts
        };
      }

      // Validation failed
      lastError = new ParseLLMError(
        `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
        'VALIDATION_FAILED',
        validationResult.error.errors
      );

      console.warn(
        `Parse validation failed (attempt ${attempts}/${maxRetries}):`,
        validationResult.error.errors
      );

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      // Otherwise, retry with more specific instructions
      // (Could enhance this to include validation errors in the prompt)
    } catch (error) {
      if (error instanceof ParseLLMError) {
        lastError = error;
      } else if (error instanceof LLMError) {
        throw new ParseLLMError(`LLM error: ${error.message}`, 'LLM_ERROR', error);
      } else {
        lastError = new ParseLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error
        );
      }

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      console.warn(`Parse attempt ${attempts}/${maxRetries} failed:`, lastError.message);
    }
  }

  // Should not reach here, but just in case
  throw new ParseLLMError(
    `Failed to parse resume after ${attempts} attempts: ${lastError?.message || 'Unknown error'}`,
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}
