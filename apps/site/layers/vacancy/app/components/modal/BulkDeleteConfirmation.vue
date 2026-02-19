<template>
  <ClientOnly>
    <UModal
      :open="open"
      :title="modalTitle"
      :description="modalDescription"
      @update:open="handleUpdateOpen"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              <h3 class="text-lg font-semibold">
                {{ $t('vacancy.list.bulkActions.confirmTitle', { count: selectedCount }) }}
              </h3>
            </div>
          </template>

          <p class="text-muted">
            {{ $t('vacancy.list.bulkActions.confirmDescription') }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" @click="handleCancel">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton
                color="error"
                :loading="isDeleting"
                :disabled="isDeleteDisabled"
                @click="handleConfirm"
              >
                {{ $t('vacancy.list.bulkActions.deleteSelected') }}
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
 * Bulk Delete Confirmation Modal
 *
 * Reusable modal for confirming bulk vacancy deletion.
 */

defineOptions({ name: 'VacancyModalBulkDeleteConfirmation' });

const props = defineProps<{
  /**
   * Controls modal open state
   */
  open: boolean;

  /**
   * Selected vacancy ids for deletion
   */
  vacancyIds: string[];
}>();

const emit = defineEmits<{
  /**
   * Emitted when modal open state changes
   */
  'update:open': [value: boolean];

  /**
   * Emitted when modal flow is finished
   */
  close: [payload: { action: 'deleted'; vacancyIds: string[] } | { action: 'cancelled' }];
}>();

const { t } = useI18n();
const toast = useToast();
const vacancyStore = useVacancyStore();

const isDeleting = ref(false);
const selectedCount = computed(() => props.vacancyIds.length);
const isDeleteDisabled = computed(() => selectedCount.value === 0 || isDeleting.value);
const modalTitle = computed(() =>
  t('vacancy.list.bulkActions.confirmTitle', { count: selectedCount.value })
);
const modalDescription = computed(() => t('vacancy.list.bulkActions.confirmDescription'));

const handleUpdateOpen = (value: boolean) => {
  emit('update:open', value);
};

const handleCancel = () => {
  emit('close', { action: 'cancelled' });
};

const handleConfirm = async () => {
  if (props.vacancyIds.length === 0) {
    return;
  }

  isDeleting.value = true;
  const idsToDelete = [...props.vacancyIds];

  try {
    await vacancyStore.bulkDeleteVacancies(idsToDelete);
    emit('close', {
      action: 'deleted',
      vacancyIds: idsToDelete
    });

    toast.add({
      title: t('vacancy.list.bulkActions.success', { count: idsToDelete.length }),
      color: 'success'
    });
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style lang="scss">
// Modal-specific styling if needed
</style>
