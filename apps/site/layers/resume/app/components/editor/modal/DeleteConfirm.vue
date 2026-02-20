<template>
  <ClientOnly>
    <UModal
      :open="open"
      :title="t('resume.page.deleteResumeConfirmTitle')"
      :description="t('resume.page.deleteResumeConfirmDescription')"
      class="resume-editor-modal-delete-confirm"
      @update:open="handleUpdateOpen"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              <h3 class="text-lg font-semibold">
                {{ t('resume.page.deleteResumeConfirmTitle') }}
              </h3>
            </div>
          </template>

          <p class="text-muted">
            {{ t('resume.page.deleteResumeConfirmDescription') }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" @click="handleCancel">
                {{ t('resume.page.deleteResumeConfirmCancel') }}
              </UButton>
              <UButton color="error" @click="handleConfirm">
                {{ t('resume.page.deleteResumeConfirmAction') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </ClientOnly>
</template>

<script setup lang="ts">
defineOptions({ name: 'ResumeEditorModalDeleteConfirm' });

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [payload: { action: 'confirmed' } | { action: 'cancelled' }];
}>();

const { t } = useI18n();

const handleUpdateOpen = (value: boolean) => {
  emit('update:open', value);
};

const handleCancel = () => {
  emit('close', { action: 'cancelled' });
};

const handleConfirm = () => {
  emit('close', { action: 'confirmed' });
};
</script>

<style lang="scss">
.resume-editor-modal-delete-confirm {
  // Reserved for modal-specific styles
}
</style>
