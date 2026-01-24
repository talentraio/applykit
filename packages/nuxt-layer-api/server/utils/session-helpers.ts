/**
 * Session Helper Utilities
 *
 * Type-safe helpers for working with user sessions
 */

export function getUserId(session: { user?: { id?: string } }): string {
  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User ID not found in session'
    })
  }
  return session.user.id
}
