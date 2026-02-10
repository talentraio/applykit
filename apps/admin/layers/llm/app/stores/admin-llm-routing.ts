import type { LlmRoutingItem, LlmScenarioKey, Role, RoutingAssignmentInput } from '@int/schema';
import { adminLlmRoutingApi } from '../infrastructure/admin-llm-routing.api';

export const useAdminLlmRoutingStore = defineStore('AdminLlmRoutingStore', {
  state: (): {
    items: LlmRoutingItem[];
    loading: boolean;
    saving: boolean;
    error: Error | null;
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
        this.error = err instanceof Error ? err : new Error('Failed to fetch routing');
        throw this.error;
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
        const updated = await adminLlmRoutingApi.updateDefault(scenarioKey, input);
        this.items = this.items.map(item => (item.scenarioKey === scenarioKey ? updated : item));
        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update scenario default');
        throw this.error;
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
        const updated = await adminLlmRoutingApi.upsertRoleOverride(scenarioKey, role, input);
        this.items = this.items.map(item => (item.scenarioKey === scenarioKey ? updated : item));
        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update role override');
        throw this.error;
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
        this.error = err instanceof Error ? err : new Error('Failed to delete role override');
        throw this.error;
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
