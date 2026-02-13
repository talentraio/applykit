import { LlmScenarioKeySchema, RoutingScenarioEnabledInputSchema } from '@int/schema';
import { llmRoutingRepository } from '../../../../../data/repositories';

/**
 * PUT /api/admin/llm/routing/:scenarioKey/enabled
 *
 * Toggle scenario availability in runtime resolver.
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

  const body = await readBody(event);
  const validation = RoutingScenarioEnabledInputSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const item = await llmRoutingRepository.updateScenarioEnabled(
    scenarioValidation.data,
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
