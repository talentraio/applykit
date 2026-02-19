import { resumeRepository, userRepository } from '../../data/repositories';

/**
 * GET /api/resume
 *
 * Get the user's default resume.
 * Falls back to most recent if defaultResumeId is null/stale.
 * Includes `name` and `isDefault` in response.
 *
 * Deprecated: Callers should migrate to GET /api/resumes/:id
 *
 * Response: Resume object with name and isDefault
 * Errors: 401, 404
 */
export default defineEventHandler(async event => {
  // Deprecation headers
  setHeader(event, 'Deprecation', 'true');
  setHeader(event, 'Link', '</api/resumes/:id>; rel="successor-version"');

  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Try to get default resume
  const defaultResumeId = await userRepository.getDefaultResumeId(userId);

  let resume = defaultResumeId
    ? await resumeRepository.findByIdAndUserId(defaultResumeId, userId)
    : null;

  // Fallback to most recent if default is null or stale
  if (!resume) {
    resume = await resumeRepository.findLatestByUserId(userId);
  }

  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  return {
    ...resume,
    isDefault: resume.id === defaultResumeId
  };
});
