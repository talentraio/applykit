<template>
  <UPageCard class="llm-models-card">
    <div class="llm-models-card__content flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold">{{ model.displayName }}</h3>
          <UBadge color="neutral" variant="soft">{{ model.status }}</UBadge>
        </div>

        <p class="text-sm text-muted">{{ model.provider }} / {{ model.modelKey }}</p>

        <p class="text-sm text-muted">
          Input: {{ model.inputPricePer1mUsd }} | Output: {{ model.outputPricePer1mUsd }}
        </p>

        <p class="text-xs text-muted">Updated: {{ formattedUpdatedAt }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" size="sm" :disabled="saving" @click="handleEdit">
          {{ t('admin.llm.models.edit') }}
        </UButton>

        <UButton
          color="error"
          variant="soft"
          size="sm"
          :disabled="saving || isArchived"
          @click="handleDeactivate"
        >
          {{ actionLabel }}
        </UButton>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import type { LlmModel } from '@int/schema';
import { LLM_MODEL_STATUS_MAP } from '@int/schema';
import { format } from 'date-fns';

type Props = {
  model: LlmModel;
  saving?: boolean;
};

defineOptions({ name: 'LlmModelsCard' });

const props = withDefaults(defineProps<Props>(), {
  saving: false
});

const emit = defineEmits<{
  edit: [model: LlmModel];
  deactivate: [model: LlmModel];
}>();

const { t } = useI18n();

const formattedUpdatedAt = computed(() => format(new Date(props.model.updatedAt), 'dd.MM.yyyy'));
const isArchived = computed(() => props.model.status === LLM_MODEL_STATUS_MAP.ARCHIVED);
const actionLabel = computed(() => {
  if (props.model.status === LLM_MODEL_STATUS_MAP.ACTIVE) {
    return t('admin.llm.models.deactivate');
  }

  return t('admin.llm.models.archive');
});

const handleEdit = () => {
  emit('edit', props.model);
};

const handleDeactivate = () => {
  emit('deactivate', props.model);
};
</script>

<style lang="scss">
.llm-models-card {
  &__content {
    // Reserved for card-specific styles.
  }
}
</style>
