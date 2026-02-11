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
          v-for="group in routingGroups"
          :key="group.key"
          :item="group.primary"
          :scenario-label="groupScenarioLabel(group)"
          :primary-model-id="selectedOverrideModelId(group)"
          :secondary-model-id="selectedSecondaryOverrideModelId(group)"
          :saved-primary-model-id="savedPrimaryOverrideModelId(group)"
          :saved-secondary-model-id="savedSecondaryOverrideModelId(group)"
          :tertiary-model-id="selectedTertiaryOverrideModelId(group)"
          :saved-tertiary-model-id="savedTertiaryOverrideModelId(group)"
          :strategy-key="selectedStrategyOverrideKeyForGroup(group)"
          :saved-strategy-key="savedStrategyOverrideKeyForGroup(group)"
          :strategy-options="strategyOptionsWithInherit"
          :info-lines="scenarioInfoLines(group)"
          :model-options="modelOptionsWithInherit"
          :primary-label="$t('admin.roles.routing.overrideLabel')"
          :secondary-label="secondaryLabelForGroup(group)"
          :tertiary-label="$t('admin.roles.routing.retryOverrideLabel')"
          :strategy-label="$t('admin.roles.routing.strategyOverrideLabel')"
          :saving="isRoutingDisabled"
          :require-primary="false"
          :require-secondary="false"
          :require-tertiary="false"
          :require-strategy="false"
          :disable-secondary-when-primary-empty="group.isResumeParse"
          :tertiary-disabled="selectedOverrideModelId(group) === INHERIT_MODEL_ID"
          :strategy-disabled="selectedOverrideModelId(group) === INHERIT_MODEL_ID"
          :show-secondary="showSecondaryForGroup(group)"
          :show-tertiary="showTertiaryForGroup(group)"
          :show-strategy="showStrategyForGroup(group)"
          :empty-value="INHERIT_MODEL_ID"
          @update:primary-model-id="setOverrideSelection(group.key, $event)"
          @update:secondary-model-id="setSecondaryOverrideSelection(group.key, $event)"
          @update:tertiary-model-id="setTertiaryOverrideSelection(group.key, $event)"
          @update:strategy-key="setStrategyOverrideSelection(group.key, $event)"
          @save="saveOverride"
        />
      </template>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import type { LlmRoutingItem, LlmScenarioKey, LlmStrategyKey, Role } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP, LLM_STRATEGY_KEY_MAP } from '@int/schema';

defineOptions({ name: 'RolesItemScenarios' });

const props = defineProps<Props>();

type Props = {
  role: Role;
};

const INHERIT_MODEL_ID = '__inherit__';
const INHERIT_STRATEGY_KEY = '__inherit_strategy__';

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
  setSecondarySelection,
  setTertiarySelection,
  setStrategySelection,
  selectedPrimaryModelId,
  selectedSecondaryModelId,
  selectedTertiaryModelId,
  selectedStrategyKey,
  clearScenarioSelections,
  clearAllSelections
} = useLlmRoutingSelection();

const { t } = useI18n();
const toast = useToast();

const routingGroups = computed(() => buildLlmRoutingGroups(routingItems.value));

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

const strategyOptionsWithInherit = computed<Array<{ label: string; value: string }>>(() => [
  {
    label: t('admin.roles.routing.inheritDefault'),
    value: INHERIT_STRATEGY_KEY
  },
  {
    label: t('admin.llm.routing.strategy.economy'),
    value: LLM_STRATEGY_KEY_MAP.ECONOMY
  },
  {
    label: t('admin.llm.routing.strategy.quality'),
    value: LLM_STRATEGY_KEY_MAP.QUALITY
  }
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

const resolveStrategyLabel = (strategyKey: string | null): string => {
  if (!strategyKey) {
    return t('admin.roles.routing.notConfigured');
  }

  if (strategyKey === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return t('admin.llm.routing.strategy.quality');
  }

  return t('admin.llm.routing.strategy.economy');
};

const defaultStrategyLabel = (item: LlmRoutingItem): string => {
  return resolveStrategyLabel(item.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY);
};

const currentOverrideModelId = (item: LlmRoutingItem): string => {
  const roleOverride = item.overrides.find(entry => entry.role === props.role);
  return roleOverride?.modelId ?? '';
};

const currentRetryOverrideModelId = (item: LlmRoutingItem): string => {
  const roleOverride = item.overrides.find(entry => entry.role === props.role);
  return roleOverride?.retryModelId ?? '';
};

const currentStrategyOverrideKey = (item: LlmRoutingItem): string => {
  const roleOverride = item.overrides.find(entry => entry.role === props.role);
  return roleOverride?.strategyKey ?? '';
};

const toSelectModelId = (modelId: string): string => {
  return modelId || INHERIT_MODEL_ID;
};

const fromSelectModelId = (value: string): string => {
  return value === INHERIT_MODEL_ID ? '' : value;
};

const toSelectStrategyKey = (value: string): string => {
  return value || INHERIT_STRATEGY_KEY;
};

const fromSelectStrategyKey = (value: string): LlmStrategyKey | null => {
  if (value === INHERIT_STRATEGY_KEY || value.length === 0) {
    return null;
  }

  if (value === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return LLM_STRATEGY_KEY_MAP.QUALITY;
  }

  return LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const showSecondaryForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): boolean => {
  return group.isResumeParse || group.secondary !== null;
};

const isAdaptationGroup = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): boolean => {
  return group.primary.scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION;
};

const showTertiaryForGroup = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): boolean => {
  return isAdaptationGroup(group);
};

const showStrategyForGroup = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): boolean => {
  return isAdaptationGroup(group);
};

const currentSecondaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (group.isResumeParse) {
    return currentRetryOverrideModelId(group.primary);
  }

  if (group.secondary) {
    return currentOverrideModelId(group.secondary);
  }

  return '';
};

const currentTertiaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (isAdaptationGroup(group)) {
    return currentRetryOverrideModelId(group.primary);
  }

  return '';
};

const currentStrategyOverrideSelection = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (!isAdaptationGroup(group)) {
    return '';
  }

  return currentStrategyOverrideKey(group.primary);
};

const savedPrimaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return toSelectModelId(currentOverrideModelId(group.primary));
};

const savedSecondaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return toSelectModelId(currentSecondaryOverrideModelId(group));
};

const savedTertiaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return toSelectModelId(currentTertiaryOverrideModelId(group));
};

const savedStrategyOverrideKeyForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return toSelectStrategyKey(currentStrategyOverrideSelection(group));
};

const selectedOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedPrimaryModelId(group.key, savedPrimaryOverrideModelId(group));
};

const selectedSecondaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedSecondaryModelId(group.key, savedSecondaryOverrideModelId(group));
};

const selectedTertiaryOverrideModelId = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedTertiaryModelId(group.key, savedTertiaryOverrideModelId(group));
};

const selectedStrategyOverrideKeyForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedStrategyKey(group.key, savedStrategyOverrideKeyForGroup(group));
};

const setOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setPrimarySelection(scenarioKey, value);
};

const setSecondaryOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setSecondarySelection(scenarioKey, value);
};

const setTertiaryOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setTertiarySelection(scenarioKey, value);
};

const setStrategyOverrideSelection = (scenarioKey: LlmScenarioKey, value: string) => {
  setStrategySelection(scenarioKey, value);
};

const secondaryLabelForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (group.isResumeParse) {
    return t('admin.roles.routing.retryOverrideLabel');
  }

  return t('admin.roles.routing.scoringOverrideLabel');
};

const groupScenarioLabel = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): string => {
  if (group.secondary) {
    return t('admin.llm.routing.scenarios.resume_adaptation_with_scoring');
  }

  const key = `admin.llm.routing.scenarios.${group.primary.scenarioKey}`;
  return t(key);
};

const scenarioInfoLines = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): string[] => {
  const lines = [
    t('admin.roles.routing.defaultModel', { model: defaultModelLabel(group.primary) })
  ];

  if (group.isResumeParse) {
    lines.push(
      t('admin.roles.routing.defaultRetryModel', { model: defaultRetryModelLabel(group.primary) })
    );
  }

  if (group.secondary) {
    lines.push(
      t('admin.roles.routing.defaultScoringModel', { model: defaultModelLabel(group.secondary) })
    );
  }

  if (isAdaptationGroup(group)) {
    lines.push(
      t('admin.roles.routing.defaultStrategy', { strategy: defaultStrategyLabel(group.primary) })
    );
  }

  return lines;
};

const saveSingleOverride = async (
  scenarioKey: LlmScenarioKey,
  modelId: string,
  existingModelId: string
) => {
  if (modelId) {
    await upsertRoleOverride(scenarioKey, props.role, {
      modelId,
      retryModelId: null
    });
    return;
  }

  if (existingModelId) {
    await deleteRoleOverride(scenarioKey, props.role);
  }
};

const saveOverride = async (scenarioKey: LlmScenarioKey) => {
  const group = routingGroups.value.find(entry => entry.key === scenarioKey);
  if (!group) return;

  const selectedPrimary = fromSelectModelId(selectedOverrideModelId(group));
  const selectedSecondary = fromSelectModelId(selectedSecondaryOverrideModelId(group));
  const selectedTertiary = fromSelectModelId(selectedTertiaryOverrideModelId(group));
  const selectedStrategy = fromSelectStrategyKey(selectedStrategyOverrideKeyForGroup(group));
  const existingPrimary = currentOverrideModelId(group.primary);
  const existingSecondary = currentSecondaryOverrideModelId(group);
  const existingTertiary = currentTertiaryOverrideModelId(group);
  const existingStrategy = currentStrategyOverrideSelection(group);

  let hasChanges = false;

  if (showSecondaryForGroup(group)) {
    hasChanges = selectedPrimary !== existingPrimary || selectedSecondary !== existingSecondary;
  } else {
    hasChanges = selectedPrimary !== existingPrimary;
  }

  const adaptationOverrideActive = selectedPrimary.length > 0 || existingPrimary.length > 0;

  if (showTertiaryForGroup(group) && adaptationOverrideActive) {
    hasChanges = hasChanges || selectedTertiary !== existingTertiary;
  }

  if (showStrategyForGroup(group) && adaptationOverrideActive) {
    const normalizedExistingStrategy = existingStrategy || '';
    const normalizedSelectedStrategy = selectedStrategy ?? '';
    hasChanges = hasChanges || normalizedSelectedStrategy !== normalizedExistingStrategy;
  }

  if (!hasChanges) return;

  try {
    if (group.isResumeParse) {
      if (selectedPrimary) {
        await upsertRoleOverride(group.primary.scenarioKey, props.role, {
          modelId: selectedPrimary,
          retryModelId: selectedSecondary || null,
          strategyKey: null
        });
      } else if (existingPrimary) {
        await deleteRoleOverride(group.primary.scenarioKey, props.role);
      }
    } else if (group.secondary) {
      await Promise.all([
        selectedPrimary
          ? upsertRoleOverride(group.primary.scenarioKey, props.role, {
              modelId: selectedPrimary,
              retryModelId: selectedTertiary || null,
              strategyKey: selectedStrategy
            })
          : existingPrimary
            ? deleteRoleOverride(group.primary.scenarioKey, props.role)
            : Promise.resolve(),
        saveSingleOverride(group.secondary.scenarioKey, selectedSecondary, existingSecondary)
      ]);
    } else {
      await saveSingleOverride(group.primary.scenarioKey, selectedPrimary, existingPrimary);
    }

    await fetchRouting();
    clearScenarioSelections(group.key);
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
