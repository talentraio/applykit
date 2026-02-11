<template>
  <div
    class="llm-routing-card grid gap-3 border-b border-muted/30 pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_minmax(280px,max-content)_minmax(280px,max-content)_auto] md:items-end"
  >
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ scenarioLabelValue }}</p>
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

    <UFormField v-if="showSecondary" :label="secondaryLabelValue" class="w-full">
      <USelectMenu
        v-model="secondaryModelIdProxy"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="saving || secondaryDisabled"
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

type Props = {
  item: LlmRoutingItem;
  scenarioLabel?: string;
  primaryModelId: string;
  secondaryModelId?: string;
  modelOptions: Array<{ label: string; value: string }>;
  infoLines?: string[];
  primaryLabel?: string;
  secondaryLabel?: string;
  savedPrimaryModelId?: string;
  savedSecondaryModelId?: string;
  requirePrimary?: boolean;
  requireSecondary?: boolean;
  disableSecondaryWhenPrimaryEmpty?: boolean;
  showSecondary?: boolean;
  emptyValue?: string;
  saving?: boolean;
};

defineOptions({ name: 'LlmRoutingCard' });

const props = withDefaults(defineProps<Props>(), {
  scenarioLabel: '',
  secondaryModelId: '',
  infoLines: () => [],
  primaryLabel: '',
  secondaryLabel: '',
  savedPrimaryModelId: '',
  savedSecondaryModelId: '',
  requirePrimary: true,
  requireSecondary: false,
  disableSecondaryWhenPrimaryEmpty: false,
  showSecondary: false,
  emptyValue: '',
  saving: false
});

const emit = defineEmits<{
  'update:primaryModelId': [value: string];
  'update:secondaryModelId': [value: string];
  save: [scenarioKey: LlmScenarioKey];
}>();

const { t } = useI18n();

const primaryModelIdProxy = computed({
  get: () => props.primaryModelId,
  set: value => emit('update:primaryModelId', value)
});

const secondaryModelIdProxy = computed({
  get: () => props.secondaryModelId,
  set: value => emit('update:secondaryModelId', value)
});

const scenarioLabelValue = computed(() => {
  if (props.scenarioLabel) {
    return props.scenarioLabel;
  }

  const key = `admin.llm.routing.scenarios.${props.item.scenarioKey}`;
  return t(key);
});

const savedPrimaryModelId = computed(() => props.savedPrimaryModelId || '');
const savedSecondaryModelId = computed(() => props.savedSecondaryModelId || '');
const primaryLabelValue = computed(() => props.primaryLabel || t('admin.llm.routing.defaultLabel'));
const secondaryLabelValue = computed(
  () => props.secondaryLabel || t('admin.llm.routing.retryLabel')
);
const isPrimaryEmpty = computed(() => primaryModelIdProxy.value === props.emptyValue);
const isSecondaryEmpty = computed(() => secondaryModelIdProxy.value === props.emptyValue);
const secondaryDisabled = computed(
  () => props.disableSecondaryWhenPrimaryEmpty && isPrimaryEmpty.value
);

const hasChanges = computed(() => {
  if (primaryModelIdProxy.value !== savedPrimaryModelId.value) return true;
  if (!props.showSecondary) return false;
  return secondaryModelIdProxy.value !== savedSecondaryModelId.value;
});

const canSave = computed(() => {
  if (!hasChanges.value) return false;

  if (props.requirePrimary && isPrimaryEmpty.value) {
    return false;
  }

  if (props.showSecondary && props.requireSecondary && !isPrimaryEmpty.value) {
    return !isSecondaryEmpty.value;
  }

  return true;
});

const handleCancel = () => {
  if (!hasChanges.value) return;

  primaryModelIdProxy.value = savedPrimaryModelId.value;

  if (props.showSecondary) {
    secondaryModelIdProxy.value = savedSecondaryModelId.value;
  }
};

const handleSave = () => {
  if (!canSave.value) return;
  emit('save', props.item.scenarioKey);
};
</script>
