import { profileRepository } from '../../data/repositories'

/**
 * GET /api/profile/complete
 *
 * Check if the current user's profile is complete
 * Used to gate generation operations
 *
 * Returns: { complete: boolean }
 *
 * Related: T087 (US3)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event)

  // Check profile completeness
  const isComplete = await profileRepository.isComplete((session.user as { id: string }).id)

  return {
    complete: isComplete
  }
})
