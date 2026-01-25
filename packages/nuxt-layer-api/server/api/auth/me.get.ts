import type { Profile, UserPublic } from '@int/schema';
/**
 * Current User Endpoint
 *
 * Returns current authenticated user and profile information
 * Requires authentication (handled by auth middleware)
 *
 * T062 [US1] GET /api/auth/me
 * TR002 - Updated to return user + profile as per spec
 */

import { profileRepository, userRepository } from '../../data/repositories';

export type AuthMeResponse = {
  user: UserPublic;
  profile: Profile | null;
};

export default defineEventHandler(async (event): Promise<AuthMeResponse> => {
  // Session is available via auth middleware (event.context.user)
  const session = await getUserSession(event);

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }

  const userId = (session.user as { id: string }).id;

  // Fetch full user from database
  const user = await userRepository.findById(userId);

  if (!user) {
    // User was deleted but session still exists
    await clearUserSession(event);
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  // Fetch profile (may be null if not created yet)
  const profile = await profileRepository.findByUserId(userId);

  // Transform profile: convert null phones to undefined for type compatibility
  const transformedProfile = profile
    ? {
        ...profile,
        phones: profile.phones ?? undefined
      }
    : null;

  // Return public user data (without googleId) and profile
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    profile: transformedProfile
  };
});
