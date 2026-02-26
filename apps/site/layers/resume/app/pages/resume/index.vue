<template>
  <div class="resume-page">
    <div class="resume-page__upload">
      <div class="resume-page__upload-container">
        <h1 class="resume-page__title">{{ $t('resume.page.title') }}</h1>

        <p class="resume-page__description">{{ $t('resume.page.description') }}</p>

        <ResumeFormUpload
          class="mt-8"
          @success="handleUploadSuccess"
          @error="handleUploadError"
          @create-from-scratch="handleCreateFromScratch"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Index Page
 *
 * Entry point for /resume route when user has no resumes.
 * Existing resumes are redirected by middleware to /resume/[defaultResumeId].
 * After first resume creation, navigates to /resume/[newId].
 *
 * Related: T026 (US1)
 */

import type { Resume } from '@int/schema';

defineOptions({ name: 'ResumeIndexPage' });

definePageMeta({
  layout: 'editor',
  middleware: 'resume-index-redirect'
});

const { t } = useI18n();
const toast = useToast();
const { openCreateFromScratchModal } = useResumeModals();

/**
 * Handle upload success — navigate to the new resume
 */
const handleUploadSuccess = (resume: Resume) => {
  toast.add({
    title: t('resume.upload.success'),
    color: 'success',
    icon: 'i-lucide-check'
  });

  // Navigate to the newly created resume
  void navigateTo(`/resume/${resume.id}`);
};

/**
 * Handle upload error
 */
const handleUploadError = (err: Error) => {
  toast.add({
    title: t('resume.error.uploadFailed'),
    description: err.message,
    color: 'error',
    icon: 'i-lucide-alert-circle'
  });
};

/**
 * Handle create from scratch click
 */
const handleCreateFromScratch = () => {
  void openCreateFromScratchModal();
};
</script>

<style lang="scss">
.resume-page {
  // Full height minus header (uses CSS variable from main.css)
  height: calc(100vh - var(--layout-header-height, 64px));

  &__upload {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 200px);
    padding: 2rem;
  }

  &__upload-container {
    max-width: 600px;
    width: 100%;
    text-align: center;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  &__description {
    font-size: 1rem;
    color: var(--color-neutral-500);
  }
}
</style>
