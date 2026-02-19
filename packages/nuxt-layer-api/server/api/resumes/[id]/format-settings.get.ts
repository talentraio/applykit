import type { FormatSettingsConfig } from '../../../types/format-settings-config';
import { resumeFormatSettingsRepository, resumeRepository } from '../../../data/repositories';

/**
 * GET /api/resumes/:id/format-settings
 *
 * Get per-resume format settings.
 * Auto-seeds defaults if no settings exist for this resume.
 *
 * Params: id — resume UUID
 * Response 200: { ats, human }
 * Errors: 401, 404
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const resumeId = getRouterParam(event, 'id');
  if (!resumeId) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  // Verify resume exists and belongs to user
  const resume = await resumeRepository.findByIdAndUserId(resumeId, userId);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  let settings = await resumeFormatSettingsRepository.findByResumeId(resumeId);

  if (!settings) {
    const config = useRuntimeConfig(event);
    const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
    settings = await resumeFormatSettingsRepository.seedDefaults(resumeId, defaults);
  }

  return {
    ats: settings.ats,
    human: settings.human
  };
});
