<template>
  <div class="admin-llm-routing-page p-4 md:p-6">
    <UiPageHeader
      :title="$t('admin.llm.routing.title')"
      :description="$t('admin.llm.routing.description')"
    />

    <div class="mt-6 space-y-4">
      <UAlert
        v-if="routingError || modelsError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="(routingError || modelsError)?.message"
      />

      <div v-if="isInitialLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UPageCard v-else-if="routingItems.length === 0">
        <div class="py-10 text-center text-sm text-muted">
          {{ $t('admin.llm.routing.empty') }}
        </div>
      </UPageCard>

      <UPageCard v-for="item in routingItems" :key="item.scenarioKey">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">{{ scenarioLabel(item.scenarioKey) }}</h2>
            <p v-if="item.description" class="text-sm text-muted">{{ item.description }}</p>
          </div>
        </template>

        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <UFormField :label="$t('admin.llm.routing.defaultLabel')">
              <USelectMenu
                v-model="defaultSelection[item.scenarioKey]"
                :items="modelOptions"
                value-key="value"
                :search-input="false"
                :disabled="routingSaving"
              />
            </UFormField>

            <UButton
              :loading="routingSaving"
              :disabled="!defaultSelection[item.scenarioKey]"
              @click="saveDefault(item.scenarioKey)"
            >
              {{ $t('admin.llm.common.save') }}
            </UButton>
          </div>

          <div class="space-y-3">
            <h3 class="text-sm font-medium text-muted">
              {{ $t('admin.llm.routing.overrideLabel') }}
            </h3>

            <div
              v-for="role in roleList"
              :key="`${item.scenarioKey}-${role}`"
              class="grid gap-3 md:grid-cols-[180px_1fr_auto_auto] md:items-end"
            >
              <div class="text-sm font-medium">{{ role }}</div>
              <UFormField label="Model">
                <USelectMenu
                  v-model="overrideSelection[item.scenarioKey]![role]"
                  :items="modelOptionsWithEmpty"
                  value-key="value"
                  :search-input="false"
                  :disabled="routingSaving"
                />
              </UFormField>
              <UButton
                size="sm"
                :loading="routingSaving"
                :disabled="!overrideSelection[item.scenarioKey]![role]"
                @click="saveOverride(item.scenarioKey, role)"
              >
                {{ $t('admin.llm.common.save') }}
              </UButton>
              <UButton
                size="sm"
                color="error"
                variant="soft"
                :loading="routingSaving"
                @click="removeOverride(item.scenarioKey, role)"
              >
                {{ $t('admin.llm.routing.removeOverride') }}
              </UButton>
            </div>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmScenarioKey, Role } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP, USER_ROLE_VALUES } from '@int/schema';

defineOptions({ name: 'AdminLlmRoutingPage' });

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  error: routingError,
  fetchAll: fetchRouting,
  updateDefault,
  upsertRoleOverride,
  deleteRoleOverride
} = useAdminLlmRouting();

const {
  activeItems: activeModels,
  loading: modelsLoading,
  error: modelsError,
  fetchAll: fetchModels
} = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const isInitialLoading = computed(() => routingLoading.value || modelsLoading.value);
const roleList = USER_ROLE_VALUES;

const defaultSelection = reactive<Record<LlmScenarioKey, string>>({
  [LLM_SCENARIO_KEY_MAP.RESUME_PARSE]: '',
  [LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION]: '',
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION]: ''
});

const overrideSelection = reactive<Record<LlmScenarioKey, Record<Role, string>>>({
  [LLM_SCENARIO_KEY_MAP.RESUME_PARSE]: {
    super_admin: '',
    friend: '',
    public: ''
  },
  [LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION]: {
    super_admin: '',
    friend: '',
    public: ''
  },
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION]: {
    super_admin: '',
    friend: '',
    public: ''
  }
});

const modelOptions = computed<Array<{ label: string; value: string }>>(() =>
  activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
);

const modelOptionsWithEmpty = computed<Array<{ label: string; value: string }>>(() => [
  { label: '-', value: '' },
  ...modelOptions.value
]);

const scenarioLabel = (scenarioKey: LlmScenarioKey): string => {
  const key = `admin.llm.routing.scenarios.${scenarioKey}`;
  return t(key);
};

const syncSelection = () => {
  routingItems.value.forEach(item => {
    defaultSelection[item.scenarioKey] = item.default?.modelId ?? '';

    roleList.forEach(role => {
      const override = item.overrides.find(entry => entry.role === role);
      overrideSelection[item.scenarioKey][role] = override?.modelId ?? '';
    });
  });
};

watch(routingItems, syncSelection, { immediate: true });

const saveDefault = async (scenarioKey: LlmScenarioKey) => {
  const modelId = defaultSelection[scenarioKey];
  if (!modelId) return;

  try {
    await updateDefault(scenarioKey, { modelId });
    await fetchRouting();
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};

const saveOverride = async (scenarioKey: LlmScenarioKey, role: Role) => {
  const modelId = overrideSelection[scenarioKey][role];
  if (!modelId) return;

  try {
    await upsertRoleOverride(scenarioKey, role, { modelId });
    await fetchRouting();
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};

const removeOverride = async (scenarioKey: LlmScenarioKey, role: Role) => {
  try {
    await deleteRoleOverride(scenarioKey, role);
    overrideSelection[scenarioKey][role] = '';
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};

await callOnce('admin-llm-routing', async () => {
  await Promise.all([fetchRouting(), fetchModels()]);
});
</script>

<style lang="scss">
.admin-llm-routing-page {
  // Reserved for page-specific styles.
}
</style>
