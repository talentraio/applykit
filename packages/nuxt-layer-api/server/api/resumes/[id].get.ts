import { resumeRepository } from '../../data/repositories';

/**
 * GET /api/resumes/:id
 *
 * Get a single resume by ID
 * Only returns resume if it belongs to the current user
 *
 * Related: T075 (US2)
 */
export default defineEventHandler(async event => {
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

  // Get resume with ownership check
  const resume = await resumeRepository.findByIdAndUserId(id, (session.user as { id: string }).id);

  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  return resume;
});
