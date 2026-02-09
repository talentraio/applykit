import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { adminLlmModelsApi } from '../infrastructure/admin-llm-models.api';

export const useAdminLlmModelsStore = defineStore('AdminLlmModelsStore', {
  state: (): {
    items: LlmModel[];
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
    hasItems: state => state.items.length > 0,
    activeItems: state => state.items.filter(item => item.status === 'active')
  },

  actions: {
    async fetchAll(): Promise<LlmModel[]> {
      this.loading = true;
      this.error = null;

      try {
        const response = await adminLlmModelsApi.fetchAll();
        this.items = response.items;
        return response.items;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch models');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    async create(input: LlmModelCreateInput): Promise<LlmModel> {
      this.saving = true;
      this.error = null;

      try {
        const created = await adminLlmModelsApi.create(input);
        this.items.unshift(created);
        return created;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to create model');
        throw this.error;
      } finally {
        this.saving = false;
      }
    },

    async update(id: string, input: LlmModelUpdateInput): Promise<LlmModel> {
      this.saving = true;
      this.error = null;

      try {
        const updated = await adminLlmModelsApi.update(id, input);
        const index = this.items.findIndex(item => item.id === id);
        if (index >= 0) {
          this.items[index] = updated;
        }
        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update model');
        throw this.error;
      } finally {
        this.saving = false;
      }
    },

    async delete(id: string): Promise<void> {
      this.saving = true;
      this.error = null;

      try {
        await adminLlmModelsApi.delete(id);
        this.items = this.items.filter(item => item.id !== id);
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to delete model');
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
  import.meta.hot.accept(acceptHMRUpdate(useAdminLlmModelsStore, import.meta.hot));
}
