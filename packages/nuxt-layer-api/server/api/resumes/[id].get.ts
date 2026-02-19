import { resumeRepository, userRepository } from '../../data/repositories';

/**
 * GET /api/resumes/:id
 *
 * Get full resume by ID with ownership check.
 * Includes computed isDefault field.
 *
 * Params: id — resume UUID
 * Response: Full resume object with isDefault
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

  return {
    id: resume.id,
    userId: resume.userId,
    name: resume.name,
    title: resume.title,
    content: resume.content,
    sourceFileName: resume.sourceFileName,
    sourceFileType: resume.sourceFileType,
    isDefault: resume.id === defaultResumeId,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString()
  };
});
