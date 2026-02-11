<template>
  <div
    class="llm-routing-card grid gap-3 border-b border-muted/30 pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_repeat(4,minmax(220px,1fr))] md:items-end"
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

    <UFormField v-if="showTertiary" :label="tertiaryLabelValue" class="w-full">
      <USelectMenu
        v-model="tertiaryModelIdProxy"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="saving || tertiaryDisabled"
        class="w-full md:min-w-[280px]"
      />
    </UFormField>
    <div v-else class="hidden md:block" />

    <UFormField v-if="showStrategy" :label="strategyLabelValue" class="w-full">
      <USelectMenu
        v-model="strategyKeyProxy"
        :items="strategyOptions"
        value-key="value"
        :search-input="false"
        :disabled="saving || strategyDisabled"
        class="w-full md:min-w-[220px]"
      />
    </UFormField>
    <div v-else class="hidden md:block" />

    <div class="flex flex-wrap justify-end gap-2 md:col-[1/-1]">
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
  tertiaryModelId?: string;
  savedTertiaryModelId?: string;
  strategyKey?: string;
  savedStrategyKey?: string;
  strategyOptions?: Array<{ label: string; value: string }>;
  requirePrimary?: boolean;
  requireSecondary?: boolean;
  requireTertiary?: boolean;
  requireStrategy?: boolean;
  disableSecondaryWhenPrimaryEmpty?: boolean;
  tertiaryDisabled?: boolean;
  showSecondary?: boolean;
  showTertiary?: boolean;
  tertiaryLabel?: string;
  showStrategy?: boolean;
  strategyLabel?: string;
  strategyDisabled?: boolean;
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
  tertiaryModelId: '',
  savedTertiaryModelId: '',
  strategyKey: '',
  savedStrategyKey: '',
  strategyOptions: () => [],
  requirePrimary: true,
  requireSecondary: false,
  requireTertiary: false,
  requireStrategy: false,
  disableSecondaryWhenPrimaryEmpty: false,
  tertiaryDisabled: false,
  showSecondary: false,
  showTertiary: false,
  tertiaryLabel: '',
  showStrategy: false,
  strategyLabel: '',
  strategyDisabled: false,
  emptyValue: '',
  saving: false
});

const emit = defineEmits<{
  'update:primaryModelId': [value: string];
  'update:secondaryModelId': [value: string];
  'update:tertiaryModelId': [value: string];
  'update:strategyKey': [value: string];
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

const tertiaryModelIdProxy = computed({
  get: () => props.tertiaryModelId,
  set: value => emit('update:tertiaryModelId', value)
});

const strategyKeyProxy = computed({
  get: () => props.strategyKey,
  set: value => emit('update:strategyKey', value)
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
const savedTertiaryModelId = computed(() => props.savedTertiaryModelId || '');
const savedStrategyKey = computed(() => props.savedStrategyKey || '');
const primaryLabelValue = computed(() => props.primaryLabel || t('admin.llm.routing.defaultLabel'));
const secondaryLabelValue = computed(
  () => props.secondaryLabel || t('admin.llm.routing.retryLabel')
);
const tertiaryLabelValue = computed(() => props.tertiaryLabel || t('admin.llm.routing.retryLabel'));
const strategyLabelValue = computed(
  () => props.strategyLabel || t('admin.llm.routing.strategyLabel')
);
const isPrimaryEmpty = computed(() => primaryModelIdProxy.value === props.emptyValue);
const isSecondaryEmpty = computed(() => secondaryModelIdProxy.value === props.emptyValue);
const isTertiaryEmpty = computed(() => tertiaryModelIdProxy.value === props.emptyValue);
const isStrategyEmpty = computed(() => strategyKeyProxy.value === props.emptyValue);
const secondaryDisabled = computed(
  () => props.disableSecondaryWhenPrimaryEmpty && isPrimaryEmpty.value
);

const hasChanges = computed(() => {
  if (primaryModelIdProxy.value !== savedPrimaryModelId.value) return true;
  if (props.showSecondary && secondaryModelIdProxy.value !== savedSecondaryModelId.value)
    return true;
  if (props.showTertiary && tertiaryModelIdProxy.value !== savedTertiaryModelId.value) return true;
  if (props.showStrategy && strategyKeyProxy.value !== savedStrategyKey.value) return true;
  return false;
});

const canSave = computed(() => {
  if (!hasChanges.value) return false;

  if (props.requirePrimary && isPrimaryEmpty.value) {
    return false;
  }

  if (props.showSecondary && props.requireSecondary && !isPrimaryEmpty.value) {
    return !isSecondaryEmpty.value;
  }

  if (props.showTertiary && props.requireTertiary && !isPrimaryEmpty.value) {
    return !isTertiaryEmpty.value;
  }

  if (props.showStrategy && props.requireStrategy) {
    return !isStrategyEmpty.value;
  }

  return true;
});

const handleCancel = () => {
  if (!hasChanges.value) return;

  primaryModelIdProxy.value = savedPrimaryModelId.value;

  if (props.showSecondary) {
    secondaryModelIdProxy.value = savedSecondaryModelId.value;
  }

  if (props.showTertiary) {
    tertiaryModelIdProxy.value = savedTertiaryModelId.value;
  }

  if (props.showStrategy) {
    strategyKeyProxy.value = savedStrategyKey.value;
  }
};

const handleSave = () => {
  if (!canSave.value) return;
  emit('save', props.item.scenarioKey);
};
</script>
