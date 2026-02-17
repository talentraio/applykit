<template>
  <UModal
    v-model:open="open"
    :title="resolvedTitle"
    :description="resolvedDescription"
    class="users-user-delete-confirm-modal"
  >
    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="handleCancel">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          color="error"
          variant="outline"
          :loading="loading"
          :disabled="loading"
          @click="handleConfirm"
        >
          {{ resolvedConfirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * UserDeleteConfirmModal Component
 *
 * Confirmation modal for deleting a user.
 */

defineOptions({ name: 'UsersUserDeleteConfirmModal' });

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
  }>(),
  {
    loading: false,
    title: undefined,
    description: undefined,
    confirmLabel: undefined
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();

const resolvedTitle = computed(() => props.title ?? t('admin.users.delete.title'));
const resolvedDescription = computed(
  () => props.description ?? t('admin.users.delete.description')
);
const resolvedConfirmLabel = computed(() => props.confirmLabel ?? t('admin.users.delete.confirm'));

const handleCancel = () => {
  open.value = false;
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>
