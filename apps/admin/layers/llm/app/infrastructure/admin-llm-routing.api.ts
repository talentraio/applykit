import type {
  LlmRoutingItem,
  LlmRoutingResponse,
  LlmScenarioKey,
  Role,
  RoutingAssignmentInput,
  RoutingScenarioEnabledInput
} from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';

const adminLlmRoutingUrl = '/api/admin/llm/routing';

const normalizeRoutingInput = (
  scenarioKey: LlmScenarioKey,
  input: RoutingAssignmentInput
): RoutingAssignmentInput => {
  const supportsRetry =
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE ||
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION ||
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL;
  const supportsStrategy = scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION;
  const supportsReasoningEffort = scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION;

  return {
    ...input,
    retryModelId: supportsRetry ? (input.retryModelId ?? null) : null,
    reasoningEffort: supportsReasoningEffort ? (input.reasoningEffort ?? null) : null,
    strategyKey: supportsStrategy ? (input.strategyKey ?? null) : null
  };
};

export const adminLlmRoutingApi = {
  async fetchAll(): Promise<LlmRoutingResponse> {
    return await useApi(adminLlmRoutingUrl, {
      method: 'GET'
    });
  },

  async updateDefault(
    scenarioKey: LlmScenarioKey,
    input: RoutingAssignmentInput
  ): Promise<LlmRoutingItem> {
    const body = normalizeRoutingInput(scenarioKey, input);
    return await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/default`, {
      method: 'PUT',
      body
    });
  },

  async updateScenarioEnabled(
    scenarioKey: LlmScenarioKey,
    input: RoutingScenarioEnabledInput
  ): Promise<LlmRoutingItem> {
    return await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/enabled`, {
      method: 'PUT',
      body: input
    });
  },

  async upsertRoleOverride(
    scenarioKey: LlmScenarioKey,
    role: Role,
    input: RoutingAssignmentInput
  ): Promise<LlmRoutingItem> {
    const body = normalizeRoutingInput(scenarioKey, input);
    return await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/roles/${role}`, {
      method: 'PUT',
      body
    });
  },

  async deleteRoleOverride(scenarioKey: LlmScenarioKey, role: Role): Promise<void> {
    await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/roles/${role}`, {
      method: 'DELETE'
    });
  }
};
