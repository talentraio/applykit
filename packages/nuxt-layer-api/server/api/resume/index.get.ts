import { resumeRepository } from '../../data/repositories';

/**
 * GET /api/resume
 *
 * Get the current user's single resume with all settings
 * Single resume architecture: one resume per user
 *
 * Response:
 * - Resume object with content and settings (atsSettings, humanSettings)
 * - Returns 404 if user has no resume yet
 *
 * Related: T010 (US1)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Get user's single resume (most recent)
  const resume = await resumeRepository.findLatestByUserId(userId);

  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  return resume;
});
