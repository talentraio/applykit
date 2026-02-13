import { LlmScenarioKeySchema, RoleSchema } from '@int/schema';
import { llmRoutingRepository } from '../../../../../../../data/repositories';

/**
 * DELETE /api/admin/llm/routing/:scenarioKey/roles/:role/enabled
 *
 * Remove role-level scenario enabled override.
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

  const deleted = await llmRoutingRepository.deleteRoleEnabledOverride(
    scenarioValidation.data,
    roleValidation.data
  );

  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Role enabled override not found'
    });
  }

  setResponseStatus(event, 204);
  return null;
});
