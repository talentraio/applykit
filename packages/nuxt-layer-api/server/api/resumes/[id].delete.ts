import { resumeRepository } from '../../data/repositories';

/**
 * DELETE /api/resumes/:id
 *
 * DEPRECATED: Use DELETE /api/resume instead (once implemented)
 *
 * Delete a resume
 * Only deletes if it belongs to the current user
 * Cascades to delete associated generations
 *
 * This endpoint is deprecated and will be removed in a future version.
 *
 * Related: T077 (US2)
 */
export default defineEventHandler(async event => {
  // Add deprecation header
  setHeader(event, 'Deprecation', 'true');
  setHeader(event, 'Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  setHeader(event, 'Link', '</api/resume>; rel="successor-version"');

  // Require authentication
  const session = await requireUserSession(event);

  // Get resume ID from route params
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  // Check if resume exists and belongs to user
  const resume = await resumeRepository.findByIdAndUserId(id, (session.user as { id: string }).id);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  // Delete resume
  await resumeRepository.delete(id, (session.user as { id: string }).id);

  return {
    success: true,
    message: 'Resume deleted successfully'
  };
});
