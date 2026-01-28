import type { UserPublic } from '@int/schema';
import { userRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * DELETE /api/admin/users/:id
 *
 * Mark user as deleted (admin-only)
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

  const updated = await userRepository.markDeleted(id);

  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    lastLoginAt: updated.lastLoginAt,
    deletedAt: updated.deletedAt
  };
});
