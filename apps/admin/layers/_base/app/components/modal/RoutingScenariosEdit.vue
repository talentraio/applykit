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
        v-if="open && formComponent"
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
          :disabled="resolvedLoading"
          @click="handleCancel"
        >
          {{ $t('admin.llm.common.cancel') }}
        </UButton>

        <UButton
          class="min-w-[120px] justify-center"
          :loading="resolvedLoading"
          :disabled="resolvedLoading || !resolvedCanSave"
          @click="handleSave"
        >
          {{ $t('admin.llm.common.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { RoutingScenarioDraft } from '@admin/llm/app/components/routing/Scenarios/types';
import type { Component } from 'vue';

type Props = {
  title: string;
  description?: string;
  formComponent: Component | null;
  formProps?: Record<string, unknown> | (() => Record<string, unknown> | null) | null;
  loading?: boolean | (() => boolean);
  canSave?: boolean | (() => boolean);
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
  close: [payload: RoutingScenariosEditModalClosePayload];
}>();

type RoutingScenariosEditModalClosePayload = { action: 'cancelled' } | { action: 'submitted' };

const open = defineModel<boolean>('open', { required: true });
const draft = defineModel<RoutingScenarioDraft>('draft', { required: true });

const isGetter = <T,>(value: T | (() => T)): value is () => T => {
  return typeof value === 'function';
};

const resolveMaybeGetter = <T,>(value: T | (() => T)): T => {
  if (isGetter(value)) {
    return value();
  }

  return value;
};

const resolvedLoading = computed<boolean>(() => {
  return resolveMaybeGetter(props.loading);
});

const resolvedCanSave = computed<boolean>(() => {
  return resolveMaybeGetter(props.canSave);
});

const resolvedFormProps = computed<Record<string, unknown>>(() => {
  const formPropsValue = props.formProps;
  const resolvedFormProps = formPropsValue ? resolveMaybeGetter(formPropsValue) : null;

  return (
    resolvedFormProps ?? {
      modelOptions: [],
      strategyOptions: [],
      reasoningOptions: []
    }
  );
});

const handleCancel = () => {
  emit('cancel');
  emit('close', { action: 'cancelled' });
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
