/**
 * Current User Endpoint
 *
 * Returns current authenticated user information
 * Requires authentication (handled by auth middleware)
 *
 * T062 [US1] GET /api/auth/me
 */

import type { UserPublic } from '@int/schema'

export default defineEventHandler(async (event): Promise<UserPublic> => {
  // Session is available via auth middleware (event.context.user)
  const session = await getUserSession(event)

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    })
  }

  const { userRepository } = await import('../../data/repositories/user')

  // Fetch full user from database
  const user = await userRepository.findById(session.user.id)

  if (!user) {
    // User was deleted but session still exists
    await clearUserSession(event)
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // Return public user data (without googleId)
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
})
