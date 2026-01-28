<template>
  <UModal v-model:open="open" class="users-user-delete-confirm-modal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
            >
              <UIcon
                name="i-lucide-alert-triangle"
                class="h-5 w-5 text-red-600 dark:text-red-400"
              />
            </div>
            <h3 class="text-lg font-semibold">
              {{ $t('admin.users.delete.title') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('admin.users.delete.description') }}
        </p>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
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
              {{ $t('admin.users.delete.confirm') }}
            </UButton>
          </div>
        </template>
      </UCard>
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

withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const handleCancel = () => {
  open.value = false;
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style lang="scss">
.users-user-delete-confirm-modal {
  // Reserved for modal-specific styling
}
</style>
