import type { Role, UserPublic } from '@int/schema';
import { RoleSchema } from '@int/schema';
import { z } from 'zod';
import { userRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * POST /api/admin/users
 *
 * Invite a user by email with a role
 * Admin-only endpoint
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

type AdminUserInput = {
  email: string;
  role: Role;
};

const AdminUserInputSchema = z.object({
  email: z.string().email(),
  role: RoleSchema
});

export default defineEventHandler(async (event): Promise<AdminUser> => {
  await requireSuperAdmin(event);

  const body = await readBody(event);
  const validation = AdminUserInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const payload: AdminUserInput = validation.data;

  const exists = await userRepository.existsByEmail(payload.email);
  if (exists) {
    throw createError({
      statusCode: 409,
      message: 'User with this email already exists'
    });
  }

  const user = await userRepository.createInvited({
    email: payload.email,
    role: payload.role
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    deletedAt: user.deletedAt
  };
});
