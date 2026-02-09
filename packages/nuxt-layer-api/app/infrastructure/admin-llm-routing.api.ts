import type {
  LlmRoutingItem,
  LlmRoutingResponse,
  LlmScenarioKey,
  Role,
  RoutingAssignmentInput
} from '@int/schema';

const adminLlmRoutingUrl = '/api/admin/llm/routing';

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
    return await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/default`, {
      method: 'PUT',
      body: input
    });
  },

  async upsertRoleOverride(
    scenarioKey: LlmScenarioKey,
    role: Role,
    input: RoutingAssignmentInput
  ): Promise<LlmRoutingItem> {
    return await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/roles/${role}`, {
      method: 'PUT',
      body: input
    });
  },

  async deleteRoleOverride(scenarioKey: LlmScenarioKey, role: Role): Promise<void> {
    await useApi(`${adminLlmRoutingUrl}/${scenarioKey}/roles/${role}`, {
      method: 'DELETE'
    });
  }
};
