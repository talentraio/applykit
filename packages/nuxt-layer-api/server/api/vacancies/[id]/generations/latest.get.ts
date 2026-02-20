import type { FormatSettingsConfig } from '@layer/api/server/types/format-settings-config';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';
import {
  generationRepository,
  resumeFormatSettingsRepository,
  vacancyRepository
} from '@layer/api/server/data/repositories';

/**
 * GET /api/vacancies/:id/generations/latest
 *
 * Get the latest non-expired generation for a vacancy
 *
 * Response: Generation object or null if no valid generation exists
 *
 * Related: T108 (US5)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Get vacancy ID from route params
  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  // Verify vacancy belongs to user
  const vacancy = await vacancyRepository.findById(vacancyId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  if (vacancy.userId !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    });
  }

  // Get latest generation (returns null if expired or not found)
  const generation = await generationRepository.findLatestByVacancyId(vacancyId);

  // Return null if no valid generation exists (valid state for new vacancies)
  if (!generation) {
    return {
      isValid: false,
      generation: null,
      formatSettings: null
    } satisfies VacanciesResumeGeneration;
  }

  const config = useRuntimeConfig(event);
  const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
  const settings =
    (await resumeFormatSettingsRepository.findByResumeId(generation.resumeId)) ??
    (await resumeFormatSettingsRepository.seedDefaults(generation.resumeId, defaults));

  return {
    isValid: true,
    generation,
    formatSettings: {
      ats: settings.ats,
      human: settings.human
    }
  } satisfies VacanciesResumeGeneration;
});
