import type { LlmRoutingItem, LlmScenarioKey, Role, RoutingAssignmentInput } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { useAdminLlmRoutingStore } from '../stores/admin-llm-routing';

export type UseAdminLlmRoutingReturn = {
  items: ComputedRef<LlmRoutingItem[]>;
  loading: ComputedRef<boolean>;
  saving: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
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
  supportsStrategy: (scenarioKey: LlmScenarioKey) => boolean;
  supportsRetry: (scenarioKey: LlmScenarioKey) => boolean;
};

export function useAdminLlmRouting(): UseAdminLlmRoutingReturn {
  const store = useAdminLlmRoutingStore();
  const nuxtApp = useNuxtApp();

  return {
    items: computed(() => store.items),
    loading: computed(() => store.loading),
    saving: computed(() => store.saving),
    error: computed(() => store.error),
    fetchAll: () => nuxtApp.runWithContext(() => store.fetchAll()),
    updateDefault: (scenarioKey: LlmScenarioKey, input: RoutingAssignmentInput) =>
      nuxtApp.runWithContext(() => store.updateDefault(scenarioKey, input)),
    upsertRoleOverride: (scenarioKey: LlmScenarioKey, role: Role, input: RoutingAssignmentInput) =>
      nuxtApp.runWithContext(() => store.upsertRoleOverride(scenarioKey, role, input)),
    deleteRoleOverride: (scenarioKey: LlmScenarioKey, role: Role) =>
      nuxtApp.runWithContext(() => store.deleteRoleOverride(scenarioKey, role)),
    supportsStrategy: (scenarioKey: LlmScenarioKey) =>
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION,
    supportsRetry: (scenarioKey: LlmScenarioKey) =>
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE ||
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
  };
}
