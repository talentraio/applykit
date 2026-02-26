import { profileRepository } from '../data/repositories';

/**
 * Profile Service
 *
 * Server-side profile validation utilities.
 */

/**
 * Require that the user has a complete profile.
 * Throws 403 if incomplete — use early in endpoint handlers.
 */
export async function requireCompleteProfile(userId: string): Promise<void> {
  const isComplete = await profileRepository.isComplete(userId);

  if (!isComplete) {
    throw createError({
      statusCode: 403,
      message: 'Profile is incomplete. Please complete your profile before proceeding.',
      data: { code: 'PROFILE_INCOMPLETE' }
    });
  }
}
