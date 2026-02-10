<template>
  <UPageCard class="roles-item-scenarios">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ $t('admin.roles.routing.title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('admin.roles.routing.description') }}
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <div v-if="isInitialLoading" class="flex items-center justify-center py-6">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <div
        v-else-if="routingItems.length === 0"
        class="rounded-lg border border-dashed border-muted p-4 text-sm text-muted"
      >
        {{ $t('admin.llm.routing.empty') }}
      </div>

      <template v-else>
        <LlmRoutingCard
          v-for="item in routingItems"
          :key="item.scenarioKey"
          :item="item"
          :primary-model-id="selectedOverrideModelId(item)"
          :retry-model-id="selectedRetryOverrideModelId(item)"
          :saved-primary-model-id="toSelectModelId(currentOverrideModelId(item))"
          :saved-retry-model-id="toSelectModelId(currentRetryOverrideModelId(item))"
          :info-lines="scenarioInfoLines(item)"
          :model-options="modelOptionsWithInherit"
          :primary-label="$t('admin.roles.routing.overrideLabel')"
          :retry-label="$t('admin.roles.routing.retryOverrideLabel')"
          :saving="isRoutingDisabled"
          :require-primary="false"
          :require-retry-for-resume-parse="false"
          :disable-retry-when-primary-empty="true"
          :empty-value="INHERIT_MODEL_ID"
          @update:primary-model-id="setOverrideSelection(item.scenarioKey, $event)"
          @update:retry-model-id="setRetryOverrideSelection(item.scenarioKey, $event)"
          @save="saveOverride"
        />
      </template>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import type { LlmRoutingItem, LlmScenarioKey, Role } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';

defineOptions({ name: 'RolesItemScenarios' });

const props = defineProps<Props>();

type Props = {
  role: Role;
};

const INHERIT_MODEL_ID = '__inherit__';

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  fetchAll: fetchRouting,
  upsertRoleOverride,
  deleteRoleOverride
} = useAdminLlmRouting();
const { items: llmModels, activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();
const {
  setPrimarySelection,
  setRetrySelection,
  selectedPrimaryModelId,
  selectedRetryModelId,
  clearScenarioSelections,
  clearAllSelections
} = useLlmRoutingSelection();

const { t } = useI18n();
const toast = useToast();

const notifyError = (error: unknown) => {
  if (!import.meta.client) return;

  toast.add({
    title: t('common.error.generic'),
    description: error instanceof Error ? error.message : undefined,
    color: 'error'
  });
};

const { pending } = await useAsyncData(
  'admin-role-scenarios',
  async () => {
    const [routingResult, modelsResult] = await Promise.allSettled([fetchRouting(), fetchModels()]);

    if (routingResult.status === 'rejected') {
      notifyError(routingResult.reason);
    }

    if (modelsResult.status === 'rejected') {
      notifyError(modelsResult.reason);
    }

    return true;
  },
  {
    watch: [() => props.role]
  }
);

const isInitialLoading = computed(() => {
  return pending.value || routingLoading.value;
});

const modelOptionsWithInherit = computed<Array<{ label: string; value: string }>>(() => [
  {
    label: t('admin.roles.routing.inheritDefault'),
    value: INHERIT_MODEL_ID
  },
  ...activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
]);

const isRoutingDisabled = computed(
  () => routingSaving.value || routingLoading.value || pending.value
);

const resolveModelLabel = (modelId: string | null): string => {
  if (!modelId) {
    return t('admin.roles.routing.notConfigured');
  }

  const model = llmModels.value.find(item => item.id === modelId);
  if (!model) {
    return t('admin.roles.routing.modelUnavailable');
  }

  return `${model.displayName} (${model.provider})`;
};

const defaultModelLabel = (item: LlmRoutingItem): string => {
  return resolveModelLabel(item.default?.modelId ?? null);
};

const defaultRetryModelLabel = (item: LlmRoutingItem): string => {
  return resolveModelLabel(item.default?.retryModelId ?? null);
};

const isResumeParseScenario = (scenarioKey: LlmScenarioKey): boolean => {
  return scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE;
};

const currentOverrideModelId = (item: LlmRoutingItem): string => {
  const roleOverride = item.overrides.find(entry => entry.role === props.role);
  return roleOverride?.modelId ?? '';
};

const currentRetryOverrideModelId = (item: LlmRoutingItem): string => {
  const roleOverride = item.overrides.find(entry => entry.role === props.role);
  return roleOverride?.retryModelId ?? '';
};

const toSelectModelId = (modelId: string): string => {
  return modelId || INHERIT_MODEL_ID;
};

const fromSelectModelId = (value: string): string => {
  return value === INHERIT_MODEL_ID ? '' : value;
};

const selectedOverrideModelId = (item: LlmRoutingItem): string => {
  return selectedPrimaryModelId(item.scenarioKey, toSelectModelId(currentOverrideModelId(item)));
};

const selectedRetryOverrideModelId = (item: LlmRoutingItem): string => {
  return selectedRetryModelId(item.scenarioKey, toSelectModelId(currentRetryOverrideModelId(item)));
};

const setOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setPrimarySelection(scenarioKey, value);
};

const setRetryOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setRetrySelection(scenarioKey, value);
};

const scenarioInfoLines = (item: LlmRoutingItem): string[] => {
  const lines = [t('admin.roles.routing.defaultModel', { model: defaultModelLabel(item) })];

  if (isResumeParseScenario(item.scenarioKey)) {
    lines.push(t('admin.roles.routing.defaultRetryModel', { model: defaultRetryModelLabel(item) }));
  }

  return lines;
};

const saveOverride = async (scenarioKey: LlmScenarioKey) => {
  const item = routingItems.value.find(entry => entry.scenarioKey === scenarioKey);
  if (!item) return;

  const selectedModelId = fromSelectModelId(selectedOverrideModelId(item));
  const selectedRetryModelId = fromSelectModelId(selectedRetryOverrideModelId(item));
  const existingModelId = currentOverrideModelId(item);
  const existingRetryModelId = currentRetryOverrideModelId(item);

  const hasChanges = isResumeParseScenario(scenarioKey)
    ? selectedModelId !== existingModelId ||
      (selectedModelId ? selectedRetryModelId : '') !==
        (existingModelId ? existingRetryModelId : '')
    : selectedModelId !== existingModelId;

  if (!hasChanges) return;

  try {
    if (selectedModelId) {
      await upsertRoleOverride(scenarioKey, props.role, {
        modelId: selectedModelId,
        retryModelId: isResumeParseScenario(scenarioKey) ? selectedRetryModelId || null : null
      });
    } else if (existingModelId) {
      await deleteRoleOverride(scenarioKey, props.role);
    }

    await fetchRouting();
    clearScenarioSelections(scenarioKey);
  } catch (error) {
    notifyError(error);
  }
};

watch(() => props.role, clearAllSelections);
</script>

<style lang="scss">
.roles-item-scenarios {
  // Reserved for component-specific styles.
}
</style>
