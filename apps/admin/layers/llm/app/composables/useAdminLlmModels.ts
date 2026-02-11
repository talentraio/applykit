import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { useAdminLlmModelsStore } from '../stores/admin-llm-models';

export type UseAdminLlmModelsReturn = {
  items: ComputedRef<LlmModel[]>;
  activeItems: ComputedRef<LlmModel[]>;
  saving: ComputedRef<boolean>;
  fetchAll: () => Promise<LlmModel[]>;
  create: (input: LlmModelCreateInput) => Promise<LlmModel>;
  update: (id: string, input: LlmModelUpdateInput) => Promise<LlmModel>;
  delete: (id: string) => Promise<void>;
};

export function useAdminLlmModels(): UseAdminLlmModelsReturn {
  const store = useAdminLlmModelsStore();
  const nuxtApp = useNuxtApp();

  return {
    items: computed(() => store.items),
    activeItems: computed(() => store.activeItems),
    saving: computed(() => store.saving),
    fetchAll: () => nuxtApp.runWithContext(() => store.fetchAll()),
    create: (input: LlmModelCreateInput) => nuxtApp.runWithContext(() => store.create(input)),
    update: (id: string, input: LlmModelUpdateInput) =>
      nuxtApp.runWithContext(() => store.update(id, input)),
    delete: (id: string) => nuxtApp.runWithContext(() => store.delete(id))
  };
}
