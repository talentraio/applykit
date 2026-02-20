import { resumeRepository, userRepository } from '../../data/repositories';

/**
 * DELETE /api/resumes/:id
 *
 * Delete a non-default resume.
 * Cascades: deletes resume_format_settings (FK cascade).
 * Prevents deletion of default resume (409).
 *
 * Params: id — resume UUID
 * Response 204: No Content
 * Errors: 401, 404, 409
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

  // Verify resume exists and belongs to user
  const resume = await resumeRepository.findByIdAndUserId(id, userId);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  // Prevent deletion of default resume
  const defaultResumeId = await userRepository.getDefaultResumeId(userId);
  if (id === defaultResumeId) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete the default resume. Set a different resume as default first.'
    });
  }

  // Delete resume (FK cascade handles format settings)
  await resumeRepository.delete(id, userId);

  setResponseStatus(event, 204);
  return null;
});
