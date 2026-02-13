<template>
  <div class="llm-routing-scenarios-form-resume-detailed-scoring grid gap-4 md:grid-cols-2">
    <UFormField
      v-if="showFlowToggle"
      :label="flowToggleLabelValue"
      :description="flowToggleDescriptionValue"
      class="md:col-span-2"
    >
      <USwitch v-model="draft.flowEnabled" :disabled="disabled" />
    </UFormField>

    <UFormField :label="primaryLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.primaryModelId"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="primaryDisabled"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="retryLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.secondaryModelId"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="retryDisabled"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import type { RoutingScenarioDraft, RoutingSelectOption } from '../types';

type Props = {
  modelOptions: RoutingSelectOption[];
  primaryLabel?: string;
  retryLabel?: string;
  disabled?: boolean;
  emptyValue?: string;
  disableRetryWhenPrimaryEmpty?: boolean;
  showFlowToggle?: boolean;
  flowToggleLabel?: string;
  flowToggleDescription?: string;
};

defineOptions({ name: 'LlmRoutingScenariosFormResumeDetailedScoring' });

const props = withDefaults(defineProps<Props>(), {
  primaryLabel: '',
  retryLabel: '',
  disabled: false,
  emptyValue: '',
  disableRetryWhenPrimaryEmpty: false,
  showFlowToggle: false,
  flowToggleLabel: '',
  flowToggleDescription: ''
});

const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });
const { t } = useI18n();

const primaryLabelValue = computed(() => {
  return props.primaryLabel || t('admin.llm.routing.defaultLabel');
});

const flowToggleLabelValue = computed(() => {
  return props.flowToggleLabel || t('admin.llm.routing.detailedScoring.enabledLabel');
});

const flowToggleDescriptionValue = computed(() => {
  return props.flowToggleDescription || t('admin.llm.routing.detailedScoring.enabledDescription');
});

const retryLabelValue = computed(() => {
  return props.retryLabel || t('admin.llm.routing.retryLabel');
});

const isPrimaryEmpty = computed(() => {
  return draft.value.primaryModelId === props.emptyValue;
});

const primaryDisabled = computed(() => {
  if (props.disabled) {
    return true;
  }

  return props.showFlowToggle && !draft.value.flowEnabled;
});

const retryDisabled = computed(() => {
  return primaryDisabled.value || (props.disableRetryWhenPrimaryEmpty && isPrimaryEmpty.value);
});
</script>

<style lang="scss">
.llm-routing-scenarios-form-resume-detailed-scoring {
  // Reserved for form-level styles.
}
</style>
