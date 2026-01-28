import type { SystemConfigKey } from '@int/schema';
import { SystemConfigValues } from '@int/schema';
import { z } from 'zod';
import { systemConfigRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * PUT /api/admin/system
 *
 * Update system configuration
 * Admin-only endpoint
 *
 * Related: T144 (US9)
 */

type AdminSystemConfig = {
  globalBudgetCap: number;
  globalBudgetUsed: number;
};

type AdminSystemConfigInput = {
  globalBudgetCap?: number;
};

const SystemConfigInputSchema = z.object({
  globalBudgetCap: SystemConfigValues.global_budget_cap.optional()
});

const formatSystemConfig = (config: Record<SystemConfigKey, unknown>): AdminSystemConfig => ({
  globalBudgetCap: SystemConfigValues.global_budget_cap.parse(config.global_budget_cap),
  globalBudgetUsed: SystemConfigValues.global_budget_used.parse(config.global_budget_used)
});

export default defineEventHandler(async (event): Promise<AdminSystemConfig> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const body = await readBody(event);
  const validation = SystemConfigInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const updates: AdminSystemConfigInput = validation.data;
  const updateActions: Promise<void>[] = [];

  if (typeof updates.globalBudgetCap === 'number') {
    updateActions.push(
      systemConfigRepository.setNumber('global_budget_cap', updates.globalBudgetCap)
    );
  }

  if (updateActions.length > 0) {
    await Promise.all(updateActions);
  }

  const config = await systemConfigRepository.getAll();

  return formatSystemConfig(config);
});
