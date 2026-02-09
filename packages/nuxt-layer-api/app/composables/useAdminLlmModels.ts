import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { useAdminLlmModelsStore } from '../stores/admin-llm-models';

export type UseAdminLlmModelsReturn = {
  items: ComputedRef<LlmModel[]>;
  activeItems: ComputedRef<LlmModel[]>;
  loading: ComputedRef<boolean>;
  saving: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  fetchAll: () => Promise<LlmModel[]>;
  create: (input: LlmModelCreateInput) => Promise<LlmModel>;
  update: (id: string, input: LlmModelUpdateInput) => Promise<LlmModel>;
  delete: (id: string) => Promise<void>;
};

export function useAdminLlmModels(): UseAdminLlmModelsReturn {
  const store = useAdminLlmModelsStore();

  return {
    items: computed(() => store.items),
    activeItems: computed(() => store.activeItems),
    loading: computed(() => store.loading),
    saving: computed(() => store.saving),
    error: computed(() => store.error),
    fetchAll: () => store.fetchAll(),
    create: (input: LlmModelCreateInput) => store.create(input),
    update: (id: string, input: LlmModelUpdateInput) => store.update(id, input),
    delete: (id: string) => store.delete(id)
  };
}
