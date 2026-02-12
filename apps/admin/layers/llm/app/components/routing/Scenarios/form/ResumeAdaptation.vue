<template>
  <div class="llm-routing-scenarios-form-resume-adaptation grid gap-4 md:grid-cols-2">
    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-lightbulb"
      :title="$t('admin.llm.routing.resumeAdaptationTips.title')"
      class="md:col-span-2"
    >
      <template #description>
        <ul class="ml-4 list-disc space-y-1 text-xs">
          <li v-for="tip in resumeAdaptationTips" :key="tip">
            {{ tip }}
          </li>
        </ul>
      </template>
    </UAlert>

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

    <UFormField :label="scoringLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.secondaryModelId"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="disabled"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="retryLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.tertiaryModelId"
        :items="modelOptions"
        value-key="value"
        :search-input="false"
        :disabled="retryDisabled"
        class="w-full"
      />
    </UFormField>

    <UFormField :label="strategyLabelValue" class="w-full">
      <USelectMenu
        v-model="draft.strategyKey"
        :items="strategyOptions"
        value-key="value"
        :search-input="false"
        :disabled="strategyDisabled"
        class="w-full"
      />
    </UFormField>

    <UPageCard
      v-if="runtimeConfig"
      variant="subtle"
      class="llm-routing-scenarios-form-resume-adaptation__runtime md:col-span-2"
    >
      <template #header>
        <h3 class="text-sm font-semibold">
          {{ t('admin.llm.routing.runtimeConfig.title') }}
        </h3>
      </template>

      <div class="grid gap-4 text-xs text-muted md:grid-cols-2">
        <div class="space-y-1">
          <p class="font-medium text-default">
            {{ t('admin.llm.routing.runtimeConfig.adaptation') }}
          </p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.temperature') }}:
            {{ runtimeConfig.adaptationTemperature }}
          </p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.maxTokens') }}:
            {{ runtimeConfig.adaptationMaxTokens }}
          </p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.responseFormat') }}:
            {{ runtimeConfig.adaptationResponseFormat }}
          </p>
        </div>

        <div class="space-y-1">
          <p class="font-medium text-default">{{ t('admin.llm.routing.runtimeConfig.scoring') }}</p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.temperature') }}:
            {{ runtimeConfig.scoringTemperature }}
          </p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.maxTokens') }}:
            {{ runtimeConfig.scoringMaxTokens }}
          </p>
          <p>
            {{ t('admin.llm.routing.runtimeConfig.responseFormat') }}:
            {{ runtimeConfig.scoringResponseFormat }}
          </p>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
import type {
  ResumeAdaptationRuntimeConfig,
  RoutingScenarioDraft,
  RoutingSelectOption
} from '../types';

type Props = {
  modelOptions: RoutingSelectOption[];
  strategyOptions: RoutingSelectOption[];
  primaryLabel?: string;
  scoringLabel?: string;
  retryLabel?: string;
  strategyLabel?: string;
  disabled?: boolean;
  emptyValue?: string;
  disableTertiaryWhenPrimaryEmpty?: boolean;
  disableStrategyWhenPrimaryEmpty?: boolean;
  runtimeConfig?: ResumeAdaptationRuntimeConfig | null;
};

defineOptions({ name: 'LlmRoutingScenariosFormResumeAdaptation' });

const props = withDefaults(defineProps<Props>(), {
  primaryLabel: '',
  scoringLabel: '',
  retryLabel: '',
  strategyLabel: '',
  disabled: false,
  emptyValue: '',
  disableTertiaryWhenPrimaryEmpty: false,
  disableStrategyWhenPrimaryEmpty: false,
  runtimeConfig: null
});

const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });
const { t } = useI18n();

const primaryLabelValue = computed(() => {
  return props.primaryLabel || t('admin.llm.routing.defaultLabel');
});

const scoringLabelValue = computed(() => {
  return props.scoringLabel || t('admin.llm.routing.scoringLabel');
});

const retryLabelValue = computed(() => {
  return props.retryLabel || t('admin.llm.routing.retryLabel');
});

const strategyLabelValue = computed(() => {
  return props.strategyLabel || t('admin.llm.routing.strategyLabel');
});

const resumeAdaptationTips = computed<string[]>(() => [
  t('admin.llm.routing.resumeAdaptationTips.cache'),
  t('admin.llm.routing.resumeAdaptationTips.strategy')
]);

const isPrimaryEmpty = computed(() => {
  return draft.value.primaryModelId === props.emptyValue;
});

const retryDisabled = computed(() => {
  return props.disabled || (props.disableTertiaryWhenPrimaryEmpty && isPrimaryEmpty.value);
});

const strategyDisabled = computed(() => {
  return props.disabled || (props.disableStrategyWhenPrimaryEmpty && isPrimaryEmpty.value);
});
</script>

<style lang="scss">
.llm-routing-scenarios-form-resume-adaptation {
  // Reserved for form-level styles.
}
</style>
