import { resumeRepository } from '../../data/repositories';

/**
 * GET /api/resumes
 *
 * DEPRECATED: Use GET /api/resume instead
 *
 * List all resumes for the current user
 * Ordered by most recent first
 *
 * This endpoint is deprecated and will be removed in a future version.
 * Migrate to the new singular /api/resume endpoint.
 *
 * Related: T073 (US2)
 */
export default defineEventHandler(async event => {
  // Add deprecation header
  setHeader(event, 'Deprecation', 'true');
  setHeader(event, 'Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  setHeader(event, 'Link', '</api/resume>; rel="successor-version"');

  // Require authentication
  const session = await requireUserSession(event);

  // Get resumes for user
  const resumes = await resumeRepository.findByUserId((session.user as { id: string }).id);

  return resumes;
});
