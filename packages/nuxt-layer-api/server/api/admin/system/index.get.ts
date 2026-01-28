import type { SystemConfigKey } from '@int/schema';
import { SystemConfigValues } from '@int/schema';
import { systemConfigRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * GET /api/admin/system
 *
 * Get system configuration
 * Admin-only endpoint
 *
 * Related: T143 (US9)
 */

type AdminSystemConfig = {
  globalBudgetCap: number;
  globalBudgetUsed: number;
};

const formatSystemConfig = (config: Record<SystemConfigKey, unknown>): AdminSystemConfig => ({
  globalBudgetCap: SystemConfigValues.global_budget_cap.parse(config.global_budget_cap),
  globalBudgetUsed: SystemConfigValues.global_budget_used.parse(config.global_budget_used)
});

export default defineEventHandler(async (event): Promise<AdminSystemConfig> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const config = await systemConfigRepository.getAll();

  return formatSystemConfig(config);
});
