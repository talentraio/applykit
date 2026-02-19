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
              <UButton
                color="error"
                :loading="isDeleting"
                :disabled="!props.vacancyId || isDeleting"
                @click="handleConfirm"
              >
                {{ isDeleting ? $t('vacancy.delete.deleting') : $t('vacancy.delete.button') }}
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

const props = defineProps<{
  /**
   * Controls modal open state
   */
  open: boolean;

  /**
   * Vacancy id to delete
   */
  vacancyId: string | null;
}>();

const emit = defineEmits<{
  /**
   * Emitted when modal open state changes
   */
  'update:open': [value: boolean];

  /**
   * Emitted when modal flow is finished
   */
  close: [payload: { action: 'deleted'; vacancyId: string } | { action: 'cancelled' }];
}>();

const { t } = useI18n();
const toast = useToast();
const vacancyStore = useVacancyStore();

const isDeleting = ref(false);
const modalTitle = computed(() => t('vacancy.delete.confirm'));
const modalDescription = computed(() => t('vacancy.delete.description'));

const handleUpdateOpen = (value: boolean) => {
  emit('update:open', value);
};

const handleCancel = () => {
  emit('close', { action: 'cancelled' });
};

const handleConfirm = async () => {
  if (!props.vacancyId) {
    return;
  }

  isDeleting.value = true;

  try {
    await vacancyStore.deleteVacancy(props.vacancyId);
    emit('close', {
      action: 'deleted',
      vacancyId: props.vacancyId
    });

    toast.add({
      title: t('vacancy.delete.success'),
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
