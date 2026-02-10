<template>
  <div
    class="llm-routing-card grid gap-3 border-b border-muted/30 pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_minmax(280px,max-content)_minmax(280px,max-content)_auto] md:items-end"
  >
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ scenarioLabel }}</p>
      <p v-if="item.description" class="text-xs text-muted">
        {{ item.description }}
      </p>
      <p v-for="line in infoLines" :key="line" class="text-xs text-muted">
        {{ line }}
      </p>
    </div>

    <UFormField :label="primaryLabelValue" class="w-full">
      <USelectMenu
        v-model="primaryModelIdProxy"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="saving"
        class="w-full md:min-w-[280px]"
      />
    </UFormField>

    <UFormField v-if="isResumeParseScenario" :label="retryLabelValue" class="w-full">
      <USelectMenu
        v-model="retryModelIdProxy"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="saving || retryDisabled"
        class="w-full md:min-w-[280px]"
      />
    </UFormField>
    <div v-else class="hidden md:block" />

    <div class="flex flex-wrap justify-end gap-2 md:col-start-4">
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="!hasChanges"
        class="min-w-[100px] justify-center"
        :class="[!hasChanges ? 'invisible pointer-events-none' : '']"
        @click="handleCancel"
      >
        {{ $t('common.cancel') }}
      </UButton>
      <UButton
        :loading="saving"
        :disabled="saving || !canSave"
        class="min-w-[100px] justify-center"
        @click="handleSave"
      >
        {{ $t('admin.llm.common.save') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmRoutingItem, LlmScenarioKey } from '@int/schema';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';

type Props = {
  item: LlmRoutingItem;
  primaryModelId: string;
  retryModelId: string;
  modelOptions: Array<{ label: string; value: string }>;
  infoLines?: string[];
  primaryLabel?: string;
  retryLabel?: string;
  savedPrimaryModelId?: string;
  savedRetryModelId?: string;
  requirePrimary?: boolean;
  requireRetryForResumeParse?: boolean;
  disableRetryWhenPrimaryEmpty?: boolean;
  emptyValue?: string;
  saving?: boolean;
};

defineOptions({ name: 'LlmRoutingCard' });

const props = withDefaults(defineProps<Props>(), {
  infoLines: () => [],
  primaryLabel: '',
  retryLabel: '',
  savedPrimaryModelId: '',
  savedRetryModelId: '',
  requirePrimary: true,
  requireRetryForResumeParse: true,
  disableRetryWhenPrimaryEmpty: false,
  emptyValue: '',
  saving: false
});

const emit = defineEmits<{
  'update:primaryModelId': [value: string];
  'update:retryModelId': [value: string];
  save: [scenarioKey: LlmScenarioKey];
}>();

const { t } = useI18n();

const primaryModelIdProxy = computed({
  get: () => props.primaryModelId,
  set: value => emit('update:primaryModelId', value)
});

const retryModelIdProxy = computed({
  get: () => props.retryModelId,
  set: value => emit('update:retryModelId', value)
});

const scenarioLabel = computed(() => {
  const key = `admin.llm.routing.scenarios.${props.item.scenarioKey}`;
  return t(key);
});

const isResumeParseScenario = computed(
  () => props.item.scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE
);
const savedPrimaryModelId = computed(() => props.savedPrimaryModelId || '');
const savedRetryModelId = computed(() => props.savedRetryModelId || '');
const primaryLabelValue = computed(() => props.primaryLabel || t('admin.llm.routing.defaultLabel'));
const retryLabelValue = computed(() => props.retryLabel || t('admin.llm.routing.retryLabel'));
const isPrimaryEmpty = computed(() => primaryModelIdProxy.value === props.emptyValue);
const isRetryEmpty = computed(() => retryModelIdProxy.value === props.emptyValue);
const retryDisabled = computed(() => props.disableRetryWhenPrimaryEmpty && isPrimaryEmpty.value);

const hasChanges = computed(() => {
  if (primaryModelIdProxy.value !== savedPrimaryModelId.value) return true;
  if (!isResumeParseScenario.value) return false;
  return retryModelIdProxy.value !== savedRetryModelId.value;
});

const canSave = computed(() => {
  if (!hasChanges.value) return false;

  if (props.requirePrimary && isPrimaryEmpty.value) {
    return false;
  }

  if (!isResumeParseScenario.value) return true;

  if (props.requireRetryForResumeParse && !isPrimaryEmpty.value) {
    return !isRetryEmpty.value;
  }

  return true;
});

const handleCancel = () => {
  if (!hasChanges.value) return;

  primaryModelIdProxy.value = savedPrimaryModelId.value;

  if (isResumeParseScenario.value) {
    retryModelIdProxy.value = savedRetryModelId.value;
  }
};

const handleSave = () => {
  if (!canSave.value) return;
  emit('save', props.item.scenarioKey);
};
</script>
