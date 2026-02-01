import { resumeRepository } from '../../data/repositories';

/**
 * GET /api/resumes/:id
 *
 * DEPRECATED: Use GET /api/resume instead
 *
 * Get a single resume by ID
 * Only returns resume if it belongs to the current user
 *
 * This endpoint is deprecated and will be removed in a future version.
 * Migrate to the new singular /api/resume endpoint.
 *
 * Related: T075 (US2)
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
