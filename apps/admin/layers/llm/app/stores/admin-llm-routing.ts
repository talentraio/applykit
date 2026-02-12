import type { LlmRoutingItem, LlmScenarioKey, Role, RoutingAssignmentInput } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { adminLlmRoutingApi } from '../infrastructure/admin-llm-routing.api';

const normalizeRoutingInputForScenario = (
  scenarioKey: LlmScenarioKey,
  input: RoutingAssignmentInput
): RoutingAssignmentInput => {
  const supportsRetry =
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE ||
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION ||
    scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL;
  const supportsStrategy = scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION;

  return {
    ...input,
    retryModelId: supportsRetry ? (input.retryModelId ?? null) : null,
    strategyKey: supportsStrategy ? (input.strategyKey ?? null) : null
  };
};

export const useAdminLlmRoutingStore = defineStore('AdminLlmRoutingStore', {
  state: (): {
    items: LlmRoutingItem[];
    loading: boolean;
    saving: boolean;
    error: string | null;
  } => ({
    items: [],
    loading: false,
    saving: false,
    error: null
  }),

  getters: {
    hasItems: state => state.items.length > 0
  },

  actions: {
    async fetchAll(): Promise<LlmRoutingItem[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await adminLlmRoutingApi.fetchAll();
        this.items = response.items;
        return response.items;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch routing';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateDefault(
      scenarioKey: LlmScenarioKey,
      input: RoutingAssignmentInput
    ): Promise<LlmRoutingItem> {
      this.saving = true;
      this.error = null;

      try {
        const normalizedInput = normalizeRoutingInputForScenario(scenarioKey, input);
        const updated = await adminLlmRoutingApi.updateDefault(scenarioKey, normalizedInput);
        this.items = this.items.map(item => (item.scenarioKey === scenarioKey ? updated : item));
        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update scenario default';
        throw err;
      } finally {
        this.saving = false;
      }
    },

    async upsertRoleOverride(
      scenarioKey: LlmScenarioKey,
      role: Role,
      input: RoutingAssignmentInput
    ): Promise<LlmRoutingItem> {
      this.saving = true;
      this.error = null;

      try {
        const normalizedInput = normalizeRoutingInputForScenario(scenarioKey, input);
        const updated = await adminLlmRoutingApi.upsertRoleOverride(
          scenarioKey,
          role,
          normalizedInput
        );
        this.items = this.items.map(item => (item.scenarioKey === scenarioKey ? updated : item));
        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update role override';
        throw err;
      } finally {
        this.saving = false;
      }
    },

    async deleteRoleOverride(scenarioKey: LlmScenarioKey, role: Role): Promise<void> {
      this.saving = true;
      this.error = null;

      try {
        await adminLlmRoutingApi.deleteRoleOverride(scenarioKey, role);
        await this.fetchAll();
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete role override';
        throw err;
      } finally {
        this.saving = false;
      }
    },

    $reset() {
      this.items = [];
      this.loading = false;
      this.saving = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminLlmRoutingStore, import.meta.hot));
}
