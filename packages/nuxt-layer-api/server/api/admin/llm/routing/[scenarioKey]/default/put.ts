import { LlmScenarioKeySchema, RoutingAssignmentInputSchema } from '@int/schema';
import { llmRoutingRepository } from '../../../../../../data/repositories';

/**
 * PUT /api/admin/llm/routing/:scenarioKey/default
 *
 * Upsert default model assignment for scenario.
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
  const validation = RoutingAssignmentInputSchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const scenarioKey = scenarioValidation.data;
  const scenario = await llmRoutingRepository.findScenario(scenarioKey);
  if (!scenario) {
    throw createError({
      statusCode: 404,
      message: 'Scenario not found'
    });
  }

  const modelActive = await llmRoutingRepository.isModelActive(validation.data.modelId);
  if (!modelActive) {
    throw createError({
      statusCode: 409,
      message: 'Model is inactive or does not exist'
    });
  }

  const item = await llmRoutingRepository.upsertScenarioDefault(scenarioKey, validation.data);
  if (!item) {
    throw createError({
      statusCode: 404,
      message: 'Scenario not found'
    });
  }

  return item;
});
