import { LlmScenarioKeySchema, RoleSchema, RoutingScenarioEnabledInputSchema } from '@int/schema';
import { llmRoutingRepository } from '../../../../../../../data/repositories';

/**
 * PUT /api/admin/llm/routing/:scenarioKey/roles/:role/enabled
 *
 * Upsert role-level scenario enabled override.
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const scenarioKeyParam = getRouterParam(event, 'scenarioKey');
  const scenarioValidation = LlmScenarioKeySchema.safeParse(scenarioKeyParam);
  if (!scenarioValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid scenario key'
    });
  }

  const roleParam = getRouterParam(event, 'role');
  const roleValidation = RoleSchema.safeParse(roleParam);
  if (!roleValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid role'
    });
  }

  const body = await readBody(event);
  const validation = RoutingScenarioEnabledInputSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const item = await llmRoutingRepository.upsertRoleEnabledOverride(
    scenarioValidation.data,
    roleValidation.data,
    validation.data.enabled
  );

  if (!item) {
    throw createError({
      statusCode: 404,
      message: 'Scenario not found'
    });
  }

  return item;
});
