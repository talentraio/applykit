import type { Generation, LLMProvider } from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';

const baseUrl = '/api/vacancies';

/**
 * Generation options for tailoring resume
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
};

/**
 * Generation API
 *
 * Handles generation CRUD operations.
 * Site-specific - only used by site app.
 * Used by vacancy store actions.
 *
 * Related: T109 (US5)
 */
export const generationApi = {
  /**
   * Generate a tailored resume for a vacancy
   */
  async generate(vacancyId: string, options: GenerateOptions = {}): Promise<Generation> {
    const body: Record<string, unknown> = {};
    if (options.resumeId) {
      body.resumeId = options.resumeId;
    }
    if (options.provider) {
      body.provider = options.provider;
    }

    return await useApi(`${baseUrl}/${vacancyId}/generate`, {
      method: 'POST',
      body
    });
  },

  /**
   * Fetch all generations for a vacancy
   */
  async fetchAll(vacancyId: string): Promise<Generation[]> {
    return await useApi(`${baseUrl}/${vacancyId}/generations`, {
      method: 'GET'
    });
  },

  /**
   * Fetch the latest valid generation for a vacancy
   */
  async fetchLatest(vacancyId: string): Promise<VacanciesResumeGeneration> {
    return await useApi(`${baseUrl}/${vacancyId}/generations/latest`, {
      method: 'GET'
    });
  },

  /**
   * Update generation content
   */
  async updateContent(
    vacancyId: string,
    generationId: string,
    content: Generation['content']
  ): Promise<Generation> {
    return await useApi(`${baseUrl}/${vacancyId}/generation`, {
      method: 'PUT',
      body: {
        content,
        generationId
      }
    });
  }
};
