import { RoleSchema } from '@int/schema';
import { roleSettingsRepository } from '../../../data/repositories';

/**
 * GET /api/admin/roles/:role
 *
 * Get settings for a single role
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const roleParam = getRouterParam(event, 'role');
  const validation = RoleSchema.safeParse(roleParam);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role'
    });
  }

  const settings = await roleSettingsRepository.getByRole(validation.data);

  return settings;
});
