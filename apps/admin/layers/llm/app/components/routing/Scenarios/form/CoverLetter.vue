<template>
  <div class="llm-routing-scenarios-form-cover-letter">
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
  </div>
</template>

<script setup lang="ts">
import type { RoutingScenarioDraft, RoutingSelectOption } from '../types';

type Props = {
  modelOptions: RoutingSelectOption[];
  primaryLabel?: string;
  disabled?: boolean;
};

defineOptions({ name: 'LlmRoutingScenariosFormCoverLetter' });

const props = withDefaults(defineProps<Props>(), {
  primaryLabel: '',
  disabled: false
});

const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });
const { t } = useI18n();

const primaryLabelValue = computed(() => {
  return props.primaryLabel || t('admin.llm.routing.defaultLabel');
});
</script>

<style lang="scss">
.llm-routing-scenarios-form-cover-letter {
  // Reserved for form-level styles.
}
</style>
