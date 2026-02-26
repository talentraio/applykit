import type { User } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';

/**
 * Admin Middleware
 *
 * Protects admin routes by requiring super_admin role
 * Applies to routes under /api/admin/
 *
 * Usage: This middleware runs automatically for admin routes
 * Requires auth middleware to run first (requireUserSession)
 */

/**
 * Check if user has super_admin role
 */
function isSuperAdmin(user: User | undefined): boolean {
  return user?.role === USER_ROLE_MAP.SUPER_ADMIN;
}

export default defineEventHandler(async event => {
  const path = getRequestURL(event).pathname;

  // Only apply to admin API routes
  if (!path.startsWith('/api/admin/')) {
    return;
  }

  // Get user session (auth middleware should have already validated this)
  const session = await getUserSession(event);

  // Session should exist (auth middleware runs first)
  if (!session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
      message: 'You must be logged in to access admin routes'
    });
  }

  // Check super_admin role
  if (!isSuperAdmin(session.user as User)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Super admin access required',
      data: { code: 'ACCESS_DENIED' }
    });
  }

  // User is super_admin, allow access
  // Store admin flag in context for convenience
  event.context.isAdmin = true;
});
