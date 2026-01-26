import type { PlatformProvider, SystemConfigKey } from '@int/schema';
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
  platformLlmEnabled: boolean;
  byokEnabled: boolean;
  platformProvider: PlatformProvider;
  globalBudgetCap: number;
  globalBudgetUsed: number;
};

type AdminSystemConfigInput = {
  platformLlmEnabled?: boolean;
  byokEnabled?: boolean;
  platformProvider?: PlatformProvider;
  globalBudgetCap?: number;
};

const SystemConfigInputSchema = z.object({
  platformLlmEnabled: SystemConfigValues.platform_llm_enabled.optional(),
  byokEnabled: SystemConfigValues.byok_enabled.optional(),
  platformProvider: SystemConfigValues.platform_provider.optional(),
  globalBudgetCap: SystemConfigValues.global_budget_cap.optional()
});

const formatSystemConfig = (config: Record<SystemConfigKey, unknown>): AdminSystemConfig => ({
  platformLlmEnabled: SystemConfigValues.platform_llm_enabled.parse(config.platform_llm_enabled),
  byokEnabled: SystemConfigValues.byok_enabled.parse(config.byok_enabled),
  platformProvider: SystemConfigValues.platform_provider.parse(config.platform_provider),
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

  if (typeof updates.platformLlmEnabled === 'boolean') {
    updateActions.push(
      systemConfigRepository.setBoolean('platform_llm_enabled', updates.platformLlmEnabled)
    );
  }

  if (typeof updates.byokEnabled === 'boolean') {
    updateActions.push(systemConfigRepository.setBoolean('byok_enabled', updates.byokEnabled));
  }

  if (updates.platformProvider) {
    updateActions.push(systemConfigRepository.setPlatformProvider(updates.platformProvider));
  }

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
