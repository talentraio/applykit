/**
 * Auth Middleware
 *
 * Protects API routes by requiring authenticated user session
 * Applies to routes under /api/ (except public routes)
 *
 * Usage: This middleware runs automatically for API routes
 * To skip auth for specific routes, add them to publicRoutes array
 */

import { USER_STATUS_MAP } from '@int/schema';
import { userRepository } from '../data/repositories';

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ['/api/health', '/api/pdf/payload', '/api/cover-letter/pdf/payload'];

/**
 * Route patterns that don't require authentication (regex)
 */
const publicPatterns = [/^\/api\/auth\//];

/**
 * Check if a route is public (doesn't require auth)
 */
function isPublicRoute(path: string): boolean {
  // Exact match
  if (publicRoutes.includes(path)) {
    return true;
  }

  // Pattern match
  return publicPatterns.some(pattern => pattern.test(path));
}

export default defineEventHandler(async event => {
  const path = getRequestURL(event).pathname;

  // Only apply to API routes
  if (!path.startsWith('/api/')) {
    return;
  }

  // Skip public routes
  if (isPublicRoute(path)) {
    return;
  }

  // Require authenticated session
  // This will automatically throw 401 if not authenticated
  const session = await requireUserSession(event);

  const userId = (session.user as { id?: string } | undefined)?.id;
  if (userId) {
    const user = await userRepository.findById(userId);
    if (user?.status === USER_STATUS_MAP.DELETED) {
      await clearUserSession(event);
      throw createError({
        statusCode: 403,
        message: 'User is deleted',
        data: { code: 'USER_DELETED' }
      });
    }
    if (user?.status === USER_STATUS_MAP.BLOCKED) {
      throw createError({
        statusCode: 403,
        message: 'User is blocked',
        data: { code: 'USER_BLOCKED' }
      });
    }
  }

  // Store user in event context for easy access in route handlers
  event.context.user = session.user;
  event.context.session = session;
});
