<template>
  <UModal v-model:open="isOpen" :title="$t('resume.upload.modalTitle')" class="resume-modal-upload">
    <template #body>
      <div class="p-4">
        <p class="mb-4 text-sm text-muted">
          {{ $t('resume.upload.modalDescription') }}
        </p>

        <ResumeFormUpload
          @success="handleSuccess"
          @error="handleError"
          @create-from-scratch="handleCreateFromScratch"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Resume Upload Modal Component
 *
 * Modal wrapper for the Upload form component.
 * Used for "Upload new file" flow when user already has a resume.
 *
 * Related: T034 (US3)
 */

import type { Resume } from '@int/schema';

defineOptions({ name: 'ResumeModalUpload' });

const emit = defineEmits<{
  /** Upload completed successfully */
  success: [resume: Resume];
  /** Upload failed */
  error: [error: Error];
  /** User chose to create from scratch */
  createFromScratch: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });

function handleSuccess(resume: Resume) {
  isOpen.value = false;
  emit('success', resume);
}

function handleError(error: Error) {
  emit('error', error);
}

function handleCreateFromScratch() {
  isOpen.value = false;
  emit('createFromScratch');
}
</script>
