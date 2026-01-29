<template>
  <ClientOnly>
    <UModal :open="open" @update:open="handleUpdateOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              <h3 class="text-lg font-semibold">
                {{ $t('vacancy.delete.confirm') }}
              </h3>
            </div>
          </template>

          <p class="text-muted">
            {{ $t('vacancy.delete.description') }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" @click="handleCancel">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton color="error" :loading="loading" @click="handleConfirm">
                {{ loading ? $t('vacancy.delete.deleting') : $t('vacancy.delete.button') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * Delete Confirmation Modal
 *
 * Reusable modal for confirming vacancy deletion.
 * Uses i18n keys from vacancy namespace.
 *
 * Related: T103 (US4)
 */

defineOptions({ name: 'VacancyModalDeleteConfirmation' });

defineProps<Props>();
const emit = defineEmits<Emits>();

type Props = {
  /**
   * Controls modal open state
   */
  open: boolean;

  /**
   * Loading state for delete action
   */
  loading?: boolean;
};

type Emits = {
  /**
   * Emitted when modal open state changes
   */
  'update:open': [value: boolean];

  /**
   * Emitted when user confirms deletion
   */
  confirm: [];

  /**
   * Emitted when user cancels deletion
   */
  cancel: [];
};

const handleUpdateOpen = (value: boolean) => {
  emit('update:open', value);
};

const handleCancel = () => {
  emit('update:open', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style lang="scss">
// Modal-specific styling if needed
</style>
