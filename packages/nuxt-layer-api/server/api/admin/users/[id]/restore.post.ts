import type { UserPublic, UserStatus } from '@int/schema';
import { USER_STATUS_MAP } from '@int/schema';
import { userRepository } from '../../../../data/repositories';
import { requireSuperAdmin } from '../../../../utils/session-helpers';

/**
 * POST /api/admin/users/:id/restore
 *
 * Restore soft-deleted user account (admin-only).
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

export default defineEventHandler(async (event): Promise<AdminUser> => {
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    });
  }

  const user = await userRepository.findById(id);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  if (user.status !== USER_STATUS_MAP.DELETED) {
    throw createError({
      statusCode: 409,
      message: 'User is not in deleted status'
    });
  }

  const restoredStatus: UserStatus = user.lastLoginAt
    ? USER_STATUS_MAP.ACTIVE
    : USER_STATUS_MAP.INVITED;
  const restored = await userRepository.restoreDeleted(id, restoredStatus);

  if (!restored) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  return {
    id: restored.id,
    email: restored.email,
    role: restored.role,
    status: restored.status,
    createdAt: restored.createdAt,
    updatedAt: restored.updatedAt,
    lastLoginAt: restored.lastLoginAt,
    deletedAt: restored.deletedAt
  };
});
