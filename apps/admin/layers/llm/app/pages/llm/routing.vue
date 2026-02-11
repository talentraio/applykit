<template>
  <div class="admin-llm-routing-page p-4 md:p-6">
    <UiPageHeader
      :title="$t('admin.llm.routing.title')"
      :description="$t('admin.llm.routing.description')"
    />

    <div class="mt-6 space-y-4">
      <UAlert
        v-if="pageErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="pageErrorMessage"
      />

      <div v-if="isInitialLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UPageCard v-else-if="routingItems.length === 0">
        <div class="py-10 text-center text-sm text-muted">
          {{ $t('admin.llm.routing.empty') }}
        </div>
      </UPageCard>

      <UPageCard v-else>
        <LlmRoutingCard
          v-for="group in routingGroups"
          :key="group.key"
          :item="group.primary"
          :scenario-label="groupScenarioLabel(group)"
          :primary-model-id="
            selectedPrimaryModelId(group.key, group.primary.default?.modelId ?? '')
          "
          :secondary-model-id="selectedSecondaryModelIdForGroup(group)"
          :saved-primary-model-id="group.primary.default?.modelId ?? ''"
          :saved-secondary-model-id="savedSecondaryModelIdForGroup(group)"
          :tertiary-model-id="selectedTertiaryModelIdForGroup(group)"
          :saved-tertiary-model-id="savedTertiaryModelIdForGroup(group)"
          :strategy-key="selectedStrategyKeyForGroup(group)"
          :saved-strategy-key="savedStrategyKeyForGroup(group)"
          :strategy-options="strategyOptions"
          :model-options="modelOptions"
          :saving="routingSaving"
          :show-secondary="showSecondaryForGroup(group)"
          :show-tertiary="showTertiaryForGroup(group)"
          :show-strategy="showStrategyForGroup(group)"
          :secondary-label="secondaryLabelForGroup(group)"
          :tertiary-label="tertiaryLabelForGroup()"
          :strategy-label="$t('admin.llm.routing.strategyLabel')"
          :require-tertiary="false"
          :require-strategy="showStrategyForGroup(group)"
          :require-secondary="showSecondaryForGroup(group)"
          :disable-secondary-when-primary-empty="group.secondary !== null"
          @update:primary-model-id="setPrimarySelection(group.key, $event)"
          @update:secondary-model-id="setSecondarySelection(group.key, $event)"
          @update:tertiary-model-id="setTertiarySelection(group.key, $event)"
          @update:strategy-key="setStrategySelection(group.key, $event)"
          @save="saveDefault"
        />
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmScenarioKey, LlmStrategyKey } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP, LLM_STRATEGY_KEY_MAP } from '@int/schema';

defineOptions({ name: 'AdminLlmRoutingPage' });

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  error: routingError,
  fetchAll: fetchRouting,
  updateDefault
} = useAdminLlmRouting();

const { activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const {
  setPrimarySelection,
  setSecondarySelection,
  setTertiarySelection,
  setStrategySelection,
  selectedPrimaryModelId,
  selectedSecondaryModelId,
  selectedTertiaryModelId,
  selectedStrategyKey,
  clearScenarioSelections
} = useLlmRoutingSelection();

const routingGroups = computed(() => buildLlmRoutingGroups(routingItems.value));

const modelOptions = computed<Array<{ label: string; value: string }>>(() =>
  activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
);

const strategyOptions = computed<Array<{ label: string; value: LlmStrategyKey }>>(() => [
  {
    label: t('admin.llm.routing.strategy.economy'),
    value: LLM_STRATEGY_KEY_MAP.ECONOMY
  },
  {
    label: t('admin.llm.routing.strategy.quality'),
    value: LLM_STRATEGY_KEY_MAP.QUALITY
  }
]);

const { pending: initialPending, error: initialLoadError } = await useAsyncData(
  'admin-llm-routing-page',
  async () => {
    await Promise.all([fetchRouting(), fetchModels()]);
    return true;
  }
);

const isInitialLoading = computed(() => {
  return initialPending.value || routingLoading.value;
});

const pageErrorMessage = computed(() => {
  if (routingError.value) {
    return routingError.value;
  }

  const errorValue = initialLoadError.value;
  if (!errorValue) {
    return '';
  }

  return errorValue instanceof Error ? errorValue.message : t('common.error.generic');
});

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

const savedSecondaryModelIdForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (group.isResumeParse) {
    return group.primary.default?.retryModelId ?? '';
  }

  return group.secondary?.default?.modelId ?? '';
};

const savedTertiaryModelIdForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (isAdaptationGroup(group)) {
    return group.primary.default?.retryModelId ?? '';
  }

  return '';
};

const savedStrategyKeyForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (!isAdaptationGroup(group)) {
    return '';
  }

  return group.primary.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const selectedSecondaryModelIdForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedSecondaryModelId(group.key, savedSecondaryModelIdForGroup(group));
};

const selectedTertiaryModelIdForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedTertiaryModelId(group.key, savedTertiaryModelIdForGroup(group));
};

const selectedStrategyKeyForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  return selectedStrategyKey(group.key, savedStrategyKeyForGroup(group));
};

const secondaryLabelForGroup = (
  group: ReturnType<typeof buildLlmRoutingGroups>[number]
): string => {
  if (group.isResumeParse) {
    return t('admin.llm.routing.retryLabel');
  }

  return t('admin.llm.routing.scoringLabel');
};

const tertiaryLabelForGroup = (): string => {
  return t('admin.llm.routing.retryLabel');
};

const normalizeStrategyKey = (value: string): LlmStrategyKey => {
  if (value === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return LLM_STRATEGY_KEY_MAP.QUALITY;
  }

  return LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const groupScenarioLabel = (group: ReturnType<typeof buildLlmRoutingGroups>[number]): string => {
  if (group.secondary) {
    return t('admin.llm.routing.scenarios.resume_adaptation_with_scoring');
  }

  const key = `admin.llm.routing.scenarios.${group.primary.scenarioKey}`;
  return t(key);
};

const saveDefault = async (scenarioKey: LlmScenarioKey) => {
  const group = routingGroups.value.find(entry => entry.key === scenarioKey);
  if (!group) return;

  const primaryModelId = selectedPrimaryModelId(group.key, group.primary.default?.modelId ?? '');
  if (!primaryModelId) return;

  const secondaryModelId = selectedSecondaryModelIdForGroup(group);
  if (showSecondaryForGroup(group) && !secondaryModelId) return;
  const tertiaryModelId = selectedTertiaryModelIdForGroup(group);
  const strategyKeyValue = selectedStrategyKeyForGroup(group);

  try {
    if (group.isResumeParse) {
      await updateDefault(group.primary.scenarioKey, {
        modelId: primaryModelId,
        retryModelId: secondaryModelId || null,
        strategyKey: null
      });
    } else if (group.secondary) {
      await Promise.all([
        updateDefault(group.primary.scenarioKey, {
          modelId: primaryModelId,
          retryModelId: tertiaryModelId || null,
          strategyKey: normalizeStrategyKey(strategyKeyValue)
        }),
        updateDefault(group.secondary.scenarioKey, {
          modelId: secondaryModelId,
          retryModelId: null,
          strategyKey: null
        })
      ]);
    } else {
      await updateDefault(group.primary.scenarioKey, {
        modelId: primaryModelId,
        retryModelId: group.primary.default?.retryModelId ?? null,
        strategyKey: null
      });
    }

    await fetchRouting();
    clearScenarioSelections(group.key);
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};
</script>

<style lang="scss">
.admin-llm-routing-page {
  // Reserved for page-specific styles.
}
</style>
