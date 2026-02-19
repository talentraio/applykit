import {
  resumeFormatSettingsRepository,
  resumeRepository,
  userRepository
} from '../../../data/repositories';

const RESUME_LIMIT = 10;

/**
 * POST /api/resumes/:id/duplicate
 *
 * Create a copy of an existing resume with cloned content and format settings.
 * Sets name to "copy <source.name>".
 * Enforces 10-resume limit (409).
 *
 * Params: id — source resume UUID
 * Response 201: New resume with isDefault = false
 * Errors: 401, 404, 409
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const sourceId = getRouterParam(event, 'id');
  if (!sourceId) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  // Verify source exists and belongs to user
  const source = await resumeRepository.findByIdAndUserId(sourceId, userId);
  if (!source) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  // Check resume limit
  const count = await resumeRepository.countByUserIdExact(userId);
  if (count >= RESUME_LIMIT) {
    throw createError({
      statusCode: 409,
      message: `Resume limit reached. Maximum ${RESUME_LIMIT} resumes allowed.`
    });
  }

  // Duplicate resume
  const newName = `copy ${source.name}`;
  const newResume = await resumeRepository.duplicate(sourceId, userId, newName);
  if (!newResume) {
    throw createError({
      statusCode: 500,
      message: 'Failed to duplicate resume'
    });
  }

  // Duplicate format settings
  await resumeFormatSettingsRepository.duplicateFrom(sourceId, newResume.id);

  // Get default resume id to compute isDefault (new resume is never default)
  const defaultResumeId = await userRepository.getDefaultResumeId(userId);

  setResponseStatus(event, 201);
  return {
    id: newResume.id,
    userId: newResume.userId,
    name: newResume.name,
    title: newResume.title,
    content: newResume.content,
    sourceFileName: newResume.sourceFileName,
    sourceFileType: newResume.sourceFileType,
    isDefault: newResume.id === defaultResumeId,
    createdAt: newResume.createdAt.toISOString(),
    updatedAt: newResume.updatedAt.toISOString()
  };
});
