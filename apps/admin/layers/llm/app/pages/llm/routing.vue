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
          v-for="item in routingItems"
          :key="item.scenarioKey"
          :item="item"
          :primary-model-id="selectedPrimaryModelId(item.scenarioKey, item.default?.modelId ?? '')"
          :retry-model-id="selectedRetryModelId(item.scenarioKey, item.default?.retryModelId ?? '')"
          :saved-primary-model-id="item.default?.modelId ?? ''"
          :saved-retry-model-id="item.default?.retryModelId ?? ''"
          :model-options="modelOptions"
          :saving="routingSaving"
          @update:primary-model-id="setPrimarySelection(item.scenarioKey, $event)"
          @update:retry-model-id="setRetrySelection(item.scenarioKey, $event)"
          @save="saveDefault"
        />
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmScenarioKey } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';

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
  setRetrySelection,
  selectedPrimaryModelId,
  selectedRetryModelId,
  clearScenarioSelections
} = useLlmRoutingSelection();

const modelOptions = computed<Array<{ label: string; value: string }>>(() =>
  activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
);

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
    return routingError.value.message;
  }

  const errorValue = initialLoadError.value;
  if (!errorValue) {
    return '';
  }

  return errorValue instanceof Error ? errorValue.message : t('common.error.generic');
});

const saveDefault = async (scenarioKey: LlmScenarioKey) => {
  const item = routingItems.value.find(entry => entry.scenarioKey === scenarioKey);
  if (!item) return;

  const modelId = selectedPrimaryModelId(scenarioKey, item.default?.modelId ?? '');
  if (!modelId) return;

  const retryModelId = selectedRetryModelId(scenarioKey, item.default?.retryModelId ?? '');
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE && !retryModelId) return;

  try {
    await updateDefault(scenarioKey, {
      modelId,
      retryModelId: retryModelId || null
    });
    await fetchRouting();
    clearScenarioSelections(scenarioKey);
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
