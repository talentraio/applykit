import { resumeRepository } from '../../data/repositories'

/**
 * GET /api/resumes
 *
 * List all resumes for the current user
 * Ordered by most recent first
 *
 * Related: T073 (US2)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event)

  // Get resumes for user
  const resumes = await resumeRepository.findByUserId((session.user as { id: string }).id)

  return resumes
})
