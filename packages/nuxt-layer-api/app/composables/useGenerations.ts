/**
 * Generations Composable
 *
 * Thin proxy for generation-related API calls.
 * Note: This is a minimal composable for US5 MVP.
 * State management can be added via Pinia store if needed in future iterations.
 *
 * Related: T109 (US5)
 */

import type { Generation, LLMProvider } from '@int/schema';

/**
 * Options for generating a tailored resume
 */
export type GenerateOptions = {
  /**
   * Resume ID to use (if not provided, uses most recent)
   */
  resumeId?: string;

  /**
   * Preferred LLM provider
   */
  provider?: LLMProvider;

  /**
   * BYOK API key (if using bring-your-own-key)
   */
  apiKey?: string;
};

export type UseGenerationsReturn = {
  /**
   * Generate a tailored resume for a vacancy
   *
   * @param vacancyId - Vacancy to tailor resume for
   * @param options - Generation options
   * @returns Generated resume with match scores
   */
  generate: (vacancyId: string, options?: GenerateOptions) => Promise<Generation>;

  /**
   * Get all generations for a vacancy
   *
   * @param vacancyId - Vacancy ID
   * @returns List of generations (newest first)
   */
  getGenerations: (vacancyId: string) => Promise<Generation[]>;

  /**
   * Get the latest valid generation for a vacancy
   *
   * @param vacancyId - Vacancy ID
   * @returns Latest generation or null if none exists or expired
   */
  getLatestGeneration: (vacancyId: string) => Promise<Generation | null>;
};

export function useGenerations(): UseGenerationsReturn {
  /**
   * Generate tailored resume
   */
  const generate = async (
    vacancyId: string,
    options: GenerateOptions = {}
  ): Promise<Generation> => {
    const headers: Record<string, string> = {};

    // Add BYOK key to headers if provided
    if (options.apiKey) {
      headers['x-api-key'] = options.apiKey;
    }

    const body: Record<string, unknown> = {};
    if (options.resumeId) {
      body.resumeId = options.resumeId;
    }
    if (options.provider) {
      body.provider = options.provider;
    }

    return await useApi(`/api/vacancies/${vacancyId}/generate`, {
      method: 'POST',
      headers,
      body
    });
  };

  /**
   * Get all generations for a vacancy
   */
  const getGenerations = async (vacancyId: string): Promise<Generation[]> => {
    return await useApi(`/api/vacancies/${vacancyId}/generations`, {
      method: 'GET'
    });
  };

  /**
   * Get latest generation for a vacancy
   */
  const getLatestGeneration = async (vacancyId: string): Promise<Generation | null> => {
    try {
      return await useApi(`/api/vacancies/${vacancyId}/generations/latest`, {
        method: 'GET'
      });
    } catch (error) {
      // If 404, no generation exists - return null
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  };

  return {
    generate,
    getGenerations,
    getLatestGeneration
  };
}
