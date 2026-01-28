import type { UserPublic, UserStatus } from '@int/schema';
import { USER_STATUS_MAP } from '@int/schema';
import { z } from 'zod';
import { userRepository } from '../../../../data/repositories';
import { requireSuperAdmin } from '../../../../utils/session-helpers';

/**
 * PUT /api/admin/users/:id/status
 *
 * Update user status (admin-only)
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

const StatusUpdateSchema = z.object({
  blocked: z.boolean()
});

function resolveStatus(
  user: Pick<UserPublic, 'lastLoginAt' | 'deletedAt'>,
  blocked: boolean
): UserStatus {
  if (blocked) return USER_STATUS_MAP.BLOCKED;
  if (user.deletedAt) return USER_STATUS_MAP.DELETED;
  if (user.lastLoginAt) return USER_STATUS_MAP.ACTIVE;
  return USER_STATUS_MAP.INVITED;
}

export default defineEventHandler(async (event): Promise<AdminUser> => {
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    });
  }

  const body = await readBody(event);
  const validation = StatusUpdateSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const user = await userRepository.findById(id);

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  const status = resolveStatus(user, validation.data.blocked);
  const updated = await userRepository.updateStatus(id, status);

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
