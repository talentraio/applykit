import type {
  Generation,
  LLMProvider,
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type {
  VacanciesResumeGeneration,
  VacanciesScoreDetailsResponse
} from '@layer/api/types/vacancies';

const baseUrl = '/api/vacancies';
const buildFormatSettingsUrl = (vacancyId: string, generationId: string): string =>
  `${baseUrl}/${vacancyId}/generations/${generationId}/format-settings`;

type GenerationFormatSettingsResponse = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

type DismissScoreAlertResponse = {
  success: true;
};

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

export type GenerateScoreDetailsOptions = {
  regenerate?: boolean;
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
   * Fetch or generate detailed scoring for a generation.
   */
  async fetchScoreDetails(
    vacancyId: string,
    generationId: string,
    options: GenerateScoreDetailsOptions = {}
  ): Promise<VacanciesScoreDetailsResponse> {
    return await useApi(`${baseUrl}/${vacancyId}/generations/${generationId}/score-details`, {
      method: 'POST',
      query: {
        regenerate: options.regenerate ? 'true' : 'false'
      }
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
  },

  /**
   * Patch per-generation format settings.
   */
  async patchFormatSettings(
    vacancyId: string,
    generationId: string,
    partial: PatchFormatSettingsBody
  ): Promise<GenerationFormatSettingsResponse> {
    return await useApi(buildFormatSettingsUrl(vacancyId, generationId), {
      method: 'PATCH',
      body: partial
    });
  },

  /**
   * Replace per-generation format settings.
   * Server endpoint accepts PATCH with full payload.
   */
  async putFormatSettings(
    vacancyId: string,
    generationId: string,
    settings: PutFormatSettingsBody
  ): Promise<GenerationFormatSettingsResponse> {
    return await useApi(buildFormatSettingsUrl(vacancyId, generationId), {
      method: 'PATCH',
      body: settings
    });
  },

  /**
   * Dismiss score alert notification for generation.
   */
  async dismissScoreAlert(
    vacancyId: string,
    generationId?: string
  ): Promise<DismissScoreAlertResponse> {
    return await useApi(`${baseUrl}/${vacancyId}/generation/dismiss-score-alert`, {
      method: 'PATCH',
      body: generationId ? { generationId } : {}
    });
  }
};
