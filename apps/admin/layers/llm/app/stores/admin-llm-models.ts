import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { adminLlmModelsApi } from '../infrastructure/admin-llm-models.api';

export const useAdminLlmModelsStore = defineStore('AdminLlmModelsStore', {
  state: (): {
    items: LlmModel[];
    saving: boolean;
  } => ({
    items: [],
    saving: false
  }),

  getters: {
    hasItems: state => state.items.length > 0,
    activeItems: state => state.items.filter(item => item.status === 'active')
  },

  actions: {
    toError(error: unknown, fallback: string): Error {
      return error instanceof Error ? error : new Error(fallback);
    },

    async fetchAll(): Promise<LlmModel[]> {
      try {
        const response = await adminLlmModelsApi.fetchAll();
        this.items = response.items;
        return response.items;
      } catch (err) {
        throw this.toError(err, 'Failed to fetch models');
      }
    },

    async create(input: LlmModelCreateInput): Promise<LlmModel> {
      this.saving = true;

      try {
        const created = await adminLlmModelsApi.create(input);
        this.items.unshift(created);
        return created;
      } catch (err) {
        throw this.toError(err, 'Failed to create model');
      } finally {
        this.saving = false;
      }
    },

    async update(id: string, input: LlmModelUpdateInput): Promise<LlmModel> {
      this.saving = true;

      try {
        const updated = await adminLlmModelsApi.update(id, input);
        const index = this.items.findIndex(item => item.id === id);
        if (index >= 0) {
          this.items[index] = updated;
        }
        return updated;
      } catch (err) {
        throw this.toError(err, 'Failed to update model');
      } finally {
        this.saving = false;
      }
    },

    async delete(id: string): Promise<void> {
      this.saving = true;

      try {
        await adminLlmModelsApi.delete(id);
        this.items = this.items.filter(item => item.id !== id);
      } catch (err) {
        throw this.toError(err, 'Failed to delete model');
      } finally {
        this.saving = false;
      }
    },

    $reset() {
      this.items = [];
      this.saving = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminLlmModelsStore, import.meta.hot));
}
