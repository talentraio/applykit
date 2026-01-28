import { USER_ROLE_VALUES } from '@int/schema';
import { roleSettingsRepository } from '../../../data/repositories';

/**
 * GET /api/admin/roles
 *
 * List role settings for all roles
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const roles = USER_ROLE_VALUES;
  const settings = await Promise.all(roles.map(role => roleSettingsRepository.getByRole(role)));

  return {
    roles: settings
  };
});
