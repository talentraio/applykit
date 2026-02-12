<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="false"
    :ui="{ content: 'max-w-2xl' }"
    class="llm-routing-scenarios-edit-modal"
  >
    <template #body>
      <component
        :is="formComponent"
        v-if="formComponent"
        v-model:draft="draft"
        v-bind="resolvedFormProps"
      />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          class="min-w-[120px] justify-center"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ $t('admin.llm.common.cancel') }}
        </UButton>

        <UButton
          class="min-w-[120px] justify-center"
          :loading="loading"
          :disabled="loading || !canSave"
          @click="handleSave"
        >
          {{ $t('admin.llm.common.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import type { RoutingScenarioDraft } from './types';

type Props = {
  title: string;
  description?: string;
  formComponent: Component | null;
  formProps?: Record<string, unknown> | null;
  loading?: boolean;
  canSave?: boolean;
};

defineOptions({ name: 'LlmRoutingScenariosEditModal' });

const props = withDefaults(defineProps<Props>(), {
  description: '',
  formProps: null,
  loading: false,
  canSave: false
});

const emit = defineEmits<{
  save: [];
  cancel: [];
}>();

const open = defineModel<boolean>('open', { required: true });
const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });

const resolvedFormProps = computed<Record<string, unknown>>(() => {
  return props.formProps ?? {};
});

const handleCancel = () => {
  emit('cancel');
  open.value = false;
};

const handleSave = () => {
  emit('save');
};
</script>

<style lang="scss">
.llm-routing-scenarios-edit-modal {
  // Reserved for modal-level styles.
}
</style>
