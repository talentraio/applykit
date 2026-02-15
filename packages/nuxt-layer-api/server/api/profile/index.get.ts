import { profileRepository } from '../../data/repositories';
import { toAbsoluteStorageUrl } from '../../utils/storage-url';

/**
 * GET /api/profile
 *
 * Get profile for the current user
 * Returns null if profile doesn't exist yet
 *
 * Related: T085 (US3)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);

  // Get profile for user
  const profile = await profileRepository.findByUserId((session.user as { id: string }).id);

  if (!profile) return null;

  return {
    ...profile,
    photoUrl: toAbsoluteStorageUrl(event, profile.photoUrl) ?? undefined
  };
});
