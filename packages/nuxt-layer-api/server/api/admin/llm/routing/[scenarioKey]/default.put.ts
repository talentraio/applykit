import {
  LLM_SCENARIO_KEY_MAP,
  LlmScenarioKeySchema,
  RoutingAssignmentInputSchema
} from '@int/schema';
import { llmRoutingRepository } from '../../../../../data/repositories';

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
  const normalizedInput = {
    ...validation.data,
    retryModelId:
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE ||
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION ||
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL
        ? (validation.data.retryModelId ?? null)
        : null,
    strategyKey:
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
        ? (validation.data.strategyKey ?? null)
        : null
  };

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

  if (normalizedInput.retryModelId) {
    const retryModelActive = await llmRoutingRepository.isModelActive(normalizedInput.retryModelId);
    if (!retryModelActive) {
      throw createError({
        statusCode: 409,
        message: 'Retry model is inactive or does not exist'
      });
    }
  }

  const item = await llmRoutingRepository.upsertScenarioDefault(scenarioKey, normalizedInput);
  if (!item) {
    throw createError({
      statusCode: 404,
      message: 'Scenario not found'
    });
  }

  return item;
});
