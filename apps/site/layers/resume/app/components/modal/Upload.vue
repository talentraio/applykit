<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('resume.upload.modalTitle')"
    :description="$t('resume.upload.modalDescription')"
    class="resume-modal-upload"
  >
    <template #body>
      <div class="p-4">
        <ResumeFormUpload
          :replace-resume-id="replaceResumeId"
          :show-title-input="isAddNewFlow"
          :require-title="isAddNewFlow"
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

type ResumeUploadModalClosePayload =
  | { action: 'uploaded'; resume: Resume }
  | { action: 'create-from-scratch'; title?: string };

defineOptions({ name: 'ResumeModalUpload' });

const props = defineProps<{
  replaceResumeId?: string;
}>();

const emit = defineEmits<{
  /** Close modal with action payload */
  close: [payload: ResumeUploadModalClosePayload];
  /** Upload failed */
  error: [error: Error];
}>();

const isOpen = defineModel<boolean>('open', { default: false });
const isAddNewFlow = computed(() => !props.replaceResumeId);

function handleSuccess(resume: Resume) {
  emit('close', {
    action: 'uploaded',
    resume
  });
}

function handleError(error: Error) {
  emit('error', error);
}

function handleCreateFromScratch(payload: { title?: string }) {
  emit('close', {
    action: 'create-from-scratch',
    title: payload.title
  });
}
</script>
