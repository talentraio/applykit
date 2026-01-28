import type { UserPublic } from '@int/schema';
import { RoleSchema, UserStatusSchema } from '@int/schema';
import { userRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * GET /api/admin/users
 *
 * List users with optional search by email
 * Supports pagination (limit/offset)
 * Admin-only endpoint
 *
 * Related: T132 (US8)
 */

type AdminUser = Pick<
  UserPublic,
  'id' | 'email' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'
>;

type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default defineEventHandler(async (event): Promise<AdminUsersResponse> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const query = getQuery(event);

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const limit = parseNumber(query.limit);
  const offset = parseNumber(query.offset);
  const role = typeof query.role === 'string' ? query.role : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;

  const roleValidation = role ? RoleSchema.safeParse(role) : null;
  if (roleValidation && !roleValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role filter'
    });
  }

  const statusValidation = status ? UserStatusSchema.safeParse(status) : null;
  if (statusValidation && !statusValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid status filter'
    });
  }

  const { users, total } = await userRepository.search({
    search: search.length > 0 ? search : undefined,
    role: roleValidation?.success ? roleValidation.data : undefined,
    status: statusValidation?.success ? statusValidation.data : undefined,
    limit,
    offset
  });

  return {
    users: users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt
    })),
    total
  };
});
