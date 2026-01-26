import type { UserPublic } from '@int/schema';
import { RoleSchema } from '@int/schema';
import { z } from 'zod';
import { userRepository } from '../../../../data/repositories';
import { requireSuperAdmin } from '../../../../utils/session-helpers';

/**
 * PUT /api/admin/users/:id/role
 *
 * Update user role (admin-only)
 *
 * Related: T134 (US8)
 */

type AdminUser = Pick<UserPublic, 'id' | 'email' | 'role' | 'createdAt'>;

const RoleUpdateSchema = z.object({
  role: RoleSchema
});

export default defineEventHandler(async (event): Promise<AdminUser> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    });
  }

  const body = await readBody(event);
  const validation = RoleUpdateSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const updated = await userRepository.updateRole(id, validation.data.role);

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
    createdAt: updated.createdAt
  };
});
