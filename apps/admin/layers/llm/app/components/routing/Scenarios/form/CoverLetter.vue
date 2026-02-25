<template>
  <div class="llm-routing-scenarios-form-cover-letter grid gap-4">
    <UPageCard variant="subtle">
      <template #header>
        <div class="llm-routing-scenarios-form-cover-letter__section-header">
          <div>
            <h3 class="text-sm font-semibold">{{ draftFlowLabelValue }}</h3>
            <p class="text-xs text-muted">{{ draftFlowDescriptionValue }}</p>
          </div>
          <USwitch
            :model-value="draft.draftFlowEnabled"
            :disabled="disabled"
            @update:model-value="handleDraftFlowEnabled"
          />
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="draftModelLabelValue" class="w-full">
          <USelectMenu
            v-model="draft.draftModelId"
            :items="modelOptions"
            value-key="value"
            :search-input="false"
            :disabled="draftModelDisabled"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="draftReasoningLabelValue" class="w-full">
          <USelectMenu
            v-model="draft.draftReasoningEffort"
            :items="reasoningOptions"
            value-key="value"
            :search-input="false"
            :disabled="draftReasoningDisabled"
            class="w-full"
          />
        </UFormField>
      </div>
    </UPageCard>

    <UPageCard variant="subtle">
      <template #header>
        <div class="llm-routing-scenarios-form-cover-letter__section-header">
          <div>
            <h3 class="text-sm font-semibold">{{ highFlowLabelValue }}</h3>
            <p class="text-xs text-muted">{{ highFlowDescriptionValue }}</p>
          </div>
          <USwitch
            :model-value="draft.highFlowEnabled"
            :disabled="disabled"
            @update:model-value="handleHighFlowEnabled"
          />
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="highModelLabelValue" class="w-full">
          <USelectMenu
            v-model="draft.highModelId"
            :items="modelOptions"
            value-key="value"
            :search-input="false"
            :disabled="highModelDisabled"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="highReasoningLabelValue" class="w-full">
          <USelectMenu
            v-model="draft.highReasoningEffort"
            :items="reasoningOptions"
            value-key="value"
            :search-input="false"
            :disabled="highReasoningDisabled"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="llm-routing-scenarios-form-cover-letter__divider" />

      <div class="llm-routing-scenarios-form-cover-letter__section-header">
        <div>
          <h3 class="text-sm font-semibold">{{ humanizerLabelValue }}</h3>
          <p class="text-xs text-muted">{{ humanizerDescriptionValue }}</p>
        </div>
        <USwitch
          :model-value="draft.highHumanizerEnabled"
          :disabled="humanizerToggleDisabled"
          @update:model-value="handleHighHumanizerEnabled"
        />
      </div>

      <UFormField :label="humanizerModelLabelValue" class="w-full mt-4">
        <USelectMenu
          v-model="draft.highHumanizerModelId"
          :items="modelOptions"
          value-key="value"
          :search-input="false"
          :disabled="humanizerModelDisabled"
          class="w-full"
        />
      </UFormField>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import type { RoutingScenarioDraft, RoutingSelectOption } from '../types';

type Props = {
  modelOptions: RoutingSelectOption[];
  reasoningOptions: RoutingSelectOption[];
  draftFlowLabel?: string;
  draftFlowDescription?: string;
  highFlowLabel?: string;
  highFlowDescription?: string;
  humanizerLabel?: string;
  humanizerDescription?: string;
  draftModelLabel?: string;
  draftReasoningLabel?: string;
  highModelLabel?: string;
  highReasoningLabel?: string;
  humanizerModelLabel?: string;
  disabled?: boolean;
};

defineOptions({ name: 'LlmRoutingScenariosFormCoverLetter' });

const props = withDefaults(defineProps<Props>(), {
  draftFlowLabel: '',
  draftFlowDescription: '',
  highFlowLabel: '',
  highFlowDescription: '',
  humanizerLabel: '',
  humanizerDescription: '',
  draftModelLabel: '',
  draftReasoningLabel: '',
  highModelLabel: '',
  highReasoningLabel: '',
  humanizerModelLabel: '',
  disabled: false
});

const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });
const { t } = useI18n();

const draftFlowLabelValue = computed(() => {
  return props.draftFlowLabel || t('admin.llm.routing.coverLetter.flow.draft.label');
});

const draftFlowDescriptionValue = computed(() => {
  return props.draftFlowDescription || t('admin.llm.routing.coverLetter.flow.draft.description');
});

const highFlowLabelValue = computed(() => {
  return props.highFlowLabel || t('admin.llm.routing.coverLetter.flow.high.label');
});

const highFlowDescriptionValue = computed(() => {
  return props.highFlowDescription || t('admin.llm.routing.coverLetter.flow.high.description');
});

const humanizerLabelValue = computed(() => {
  return props.humanizerLabel || t('admin.llm.routing.coverLetter.flow.humanizer.label');
});

const humanizerDescriptionValue = computed(() => {
  return (
    props.humanizerDescription || t('admin.llm.routing.coverLetter.flow.humanizer.description')
  );
});

const draftModelLabelValue = computed(() => {
  return props.draftModelLabel || t('admin.llm.routing.coverLetter.flow.draft.modelLabel');
});

const draftReasoningLabelValue = computed(() => {
  return props.draftReasoningLabel || t('admin.llm.routing.coverLetter.flow.draft.reasoningLabel');
});

const highModelLabelValue = computed(() => {
  return props.highModelLabel || t('admin.llm.routing.coverLetter.flow.high.modelLabel');
});

const highReasoningLabelValue = computed(() => {
  return props.highReasoningLabel || t('admin.llm.routing.coverLetter.flow.high.reasoningLabel');
});

const humanizerModelLabelValue = computed(() => {
  return props.humanizerModelLabel || t('admin.llm.routing.coverLetter.flow.humanizer.modelLabel');
});

const draftModelDisabled = computed(() => {
  return props.disabled || !draft.value.draftFlowEnabled;
});

const draftReasoningDisabled = computed(() => {
  return props.disabled || !draft.value.draftFlowEnabled;
});

const highModelDisabled = computed(() => {
  return props.disabled || !draft.value.highFlowEnabled;
});

const highReasoningDisabled = computed(() => {
  return props.disabled || !draft.value.highFlowEnabled;
});

const humanizerToggleDisabled = computed(() => {
  return props.disabled || !draft.value.highFlowEnabled;
});

const humanizerModelDisabled = computed(() => {
  return props.disabled || !draft.value.highFlowEnabled || !draft.value.highHumanizerEnabled;
});

const handleDraftFlowEnabled = (value: boolean): void => {
  draft.value.draftFlowEnabled = value;
};

const handleHighFlowEnabled = (value: boolean): void => {
  draft.value.highFlowEnabled = value;
  if (!value) {
    draft.value.highHumanizerEnabled = false;
  }
};

const handleHighHumanizerEnabled = (value: boolean): void => {
  draft.value.highHumanizerEnabled = draft.value.highFlowEnabled ? value : false;
  if (!draft.value.highFlowEnabled) {
    draft.value.highHumanizerEnabled = false;
  }
  if (!draft.value.highHumanizerEnabled) {
    draft.value.highHumanizerModelId = '';
  }
};
</script>

<style lang="scss">
.llm-routing-scenarios-form-cover-letter {
  &__section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__divider {
    border-top: 1px solid var(--ui-border);
    margin-top: 1rem;
    padding-top: 1rem;
  }
}
</style>
