<template>
  <div class="llm-routing-scenarios-form-resume-detailed-scoring grid gap-4 md:grid-cols-2">
    <UFormField :label="primaryLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.primaryModelId"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="disabled"
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
};

defineOptions({ name: 'LlmRoutingScenariosFormResumeDetailedScoring' });

const props = withDefaults(defineProps<Props>(), {
  primaryLabel: '',
  retryLabel: '',
  disabled: false,
  emptyValue: '',
  disableRetryWhenPrimaryEmpty: false
});

const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });
const { t } = useI18n();

const primaryLabelValue = computed(() => {
  return props.primaryLabel || t('admin.llm.routing.defaultLabel');
});

const retryLabelValue = computed(() => {
  return props.retryLabel || t('admin.llm.routing.retryLabel');
});

const isPrimaryEmpty = computed(() => {
  return draft.value.primaryModelId === props.emptyValue;
});

const retryDisabled = computed(() => {
  return props.disabled || (props.disableRetryWhenPrimaryEmpty && isPrimaryEmpty.value);
});
</script>

<style lang="scss">
.llm-routing-scenarios-form-resume-detailed-scoring {
  // Reserved for form-level styles.
}
</style>
