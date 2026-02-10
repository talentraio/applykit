import type { LlmRoutingItem, LlmScenarioKey, Role, RoutingAssignmentInput } from '@int/schema';
import { useAdminLlmRoutingStore } from '../stores/admin-llm-routing';

export type UseAdminLlmRoutingReturn = {
  items: ComputedRef<LlmRoutingItem[]>;
  loading: ComputedRef<boolean>;
  saving: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  fetchAll: () => Promise<LlmRoutingItem[]>;
  updateDefault: (
    scenarioKey: LlmScenarioKey,
    input: RoutingAssignmentInput
  ) => Promise<LlmRoutingItem>;
  upsertRoleOverride: (
    scenarioKey: LlmScenarioKey,
    role: Role,
    input: RoutingAssignmentInput
  ) => Promise<LlmRoutingItem>;
  deleteRoleOverride: (scenarioKey: LlmScenarioKey, role: Role) => Promise<void>;
};

export function useAdminLlmRouting(): UseAdminLlmRoutingReturn {
  const store = useAdminLlmRoutingStore();

  return {
    items: computed(() => store.items),
    loading: computed(() => store.loading),
    saving: computed(() => store.saving),
    error: computed(() => store.error),
    fetchAll: () => store.fetchAll(),
    updateDefault: (scenarioKey: LlmScenarioKey, input: RoutingAssignmentInput) =>
      store.updateDefault(scenarioKey, input),
    upsertRoleOverride: (scenarioKey: LlmScenarioKey, role: Role, input: RoutingAssignmentInput) =>
      store.upsertRoleOverride(scenarioKey, role, input),
    deleteRoleOverride: (scenarioKey: LlmScenarioKey, role: Role) =>
      store.deleteRoleOverride(scenarioKey, role)
  };
}
