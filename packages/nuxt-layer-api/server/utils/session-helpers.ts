/**
 * Session Helper Utilities
 *
 * Type-safe helpers for working with user sessions
 */

import type { Role } from '@int/schema';
import type { H3Event } from 'h3';
import type { ExtendedUser, ExtendedUserSession } from './auth-types';
import { RoleSchema, USER_ROLE_MAP } from '@int/schema';
import { userRepository } from '../data/repositories';

export function getUserId(session: { user?: { id?: string } }): string {
  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User ID not found in session'
    });
  }
  return session.user.id;
}

/**
 * Require super_admin role for admin endpoints
 * Throws 401 if not authenticated, 403 if not super_admin
 *
 * Note: Uses type assertion because nuxt-auth-utils session type is generic,
 * but we know we store ExtendedUser in setUserSession (see auth/google.ts:44-50)
 */
export async function requireSuperAdmin(event: H3Event): Promise<ExtendedUserSession> {
  const session = await requireUserSession(event);
  const effectiveRole = await getEffectiveUserRole(event);

  // Type assertion: we store ExtendedUser in session (role + email + id)
  const user = {
    ...(session.user as unknown as ExtendedUser),
    role: effectiveRole
  };

  if (effectiveRole !== USER_ROLE_MAP.SUPER_ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Access denied. Super admin role required.',
      data: { code: 'ACCESS_DENIED' }
    });
  }

  return { user };
}

/**
 * Resolve effective user role using DB as source of truth.
 * Falls back to validated session role when DB row is unavailable.
 */
export async function getEffectiveUserRole(event: H3Event): Promise<Role> {
  const session = await requireUserSession(event);
  const userId = getUserId(session);

  const sessionRoleValidation = RoleSchema.safeParse(session.user?.role);
  const fallbackRole: Role = sessionRoleValidation.success
    ? sessionRoleValidation.data
    : USER_ROLE_MAP.PUBLIC;

  const user = await userRepository.findById(userId);
  return user?.role ?? fallbackRole;
}
