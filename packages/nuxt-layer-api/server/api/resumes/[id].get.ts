import type { FormatSettingsConfig } from '../../types/format-settings-config';
import {
  resumeFormatSettingsRepository,
  resumeRepository,
  userRepository
} from '../../data/repositories';

/**
 * GET /api/resumes/:id
 *
 * Get full resume by ID with ownership check.
 * Includes computed isDefault field and per-resume format settings.
 *
 * Params: id — resume UUID
 * Response: Full resume object with isDefault and formatSettings
 * Errors: 401, 404
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  const [resume, defaultResumeId] = await Promise.all([
    resumeRepository.findByIdAndUserId(id, userId),
    userRepository.getDefaultResumeId(userId)
  ]);

  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  const config = useRuntimeConfig(event);
  const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
  const settings =
    (await resumeFormatSettingsRepository.findByResumeId(resume.id)) ??
    (await resumeFormatSettingsRepository.seedDefaults(resume.id, defaults));

  return {
    id: resume.id,
    userId: resume.userId,
    name: resume.name,
    title: resume.title,
    content: resume.content,
    sourceFileName: resume.sourceFileName,
    sourceFileType: resume.sourceFileType,
    isDefault: resume.id === defaultResumeId,
    formatSettings: {
      ats: settings.ats,
      human: settings.human
    },
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString()
  };
});
