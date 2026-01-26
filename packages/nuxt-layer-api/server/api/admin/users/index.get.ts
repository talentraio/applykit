import type { UserPublic } from '@int/schema';
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

type AdminUser = Pick<UserPublic, 'id' | 'email' | 'role' | 'createdAt'>;

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

  const { users, total } = await userRepository.search({
    search: search.length > 0 ? search : undefined,
    limit,
    offset
  });

  return {
    users: users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    })),
    total
  };
});
