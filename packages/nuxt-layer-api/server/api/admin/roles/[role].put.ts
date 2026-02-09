import { PlatformProviderSchema, RoleSchema, USER_ROLE_MAP } from '@int/schema';
import { z } from 'zod';
import { roleSettingsRepository } from '../../../data/repositories';

/**
 * PUT /api/admin/roles/:role
 *
 * Update role settings
 */

const RoleSettingsInputSchema = z.object({
  platformLlmEnabled: z.boolean().optional(),
  platformProvider: PlatformProviderSchema.optional(),
  dailyBudgetCap: z.number().min(0).optional()
});

export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const roleParam = getRouterParam(event, 'role');
  const roleValidation = RoleSchema.safeParse(roleParam);

  if (!roleValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role'
    });
  }

  const body = await readBody(event);
  const validation = RoleSettingsInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const role = roleValidation.data;
  const updates = validation.data;

  const current = await roleSettingsRepository.getByRole(role);

  const merged = {
    role,
    platformLlmEnabled: current.platformLlmEnabled,
    platformProvider: current.platformProvider,
    dailyBudgetCap: current.dailyBudgetCap
  };

  if (role === USER_ROLE_MAP.SUPER_ADMIN) {
    if (updates.platformProvider) {
      merged.platformProvider = updates.platformProvider;
    }
  } else {
    if (typeof updates.platformLlmEnabled === 'boolean') {
      merged.platformLlmEnabled = updates.platformLlmEnabled;
    }

    if (updates.platformProvider) {
      merged.platformProvider = updates.platformProvider;
    }

    if (typeof updates.dailyBudgetCap === 'number') {
      merged.dailyBudgetCap = updates.dailyBudgetCap;
    }
  }

  const saved = await roleSettingsRepository.upsert(merged);

  return saved;
});
