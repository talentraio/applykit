<template>
  <div class="resume-upload-page container mx-auto max-w-4xl p-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="mb-4">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/resumes">
          {{ $t('common.back') }}
        </UButton>
      </div>
      <h1 class="text-3xl font-bold">
        {{ $t('resume.upload.title') }}
      </h1>
      <p class="mt-2 text-muted">
        {{ $t('resume.upload.formats') }}
      </p>
    </div>

    <!-- Upload Card -->
    <UPageCard>
      <ResumeUploader
        :loading="isUploading"
        :disabled="!isProfileComplete"
        @upload="handleUpload"
        @success="handleSuccess"
        @error="handleError"
        @blocked="showProfileModal = true"
      />

      <!-- Additional Info -->
      <template #footer>
        <div class="space-y-3 text-sm text-muted">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-info" class="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Your resume will be parsed automatically using AI. You can review and edit the parsed
              data after upload.
            </p>
          </div>
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-shield-check" class="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Your data is secure and private. We use encryption to protect your information.</p>
          </div>
        </div>
      </template>
    </UPageCard>

    <!-- Rate Limit Info -->
    <UAlert color="primary" variant="soft" icon="i-lucide-zap" class="mt-6">
      <template #title> Parse Limits </template>
      <template #description>
        Free users can parse up to 3 resumes per day. Premium users get higher limits or can use
        their own API keys.
      </template>
    </UAlert>

    <!-- Profile Incomplete Modal -->
    <ResumeProfileIncompleteModal v-model:open="showProfileModal" />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Upload Page
 *
 * Upload new resume file with drag-and-drop
 * Redirects to detail page after successful upload
 *
 * T083 [US2] Resume upload page
 */

import type { Resume } from '@int/schema';

defineOptions({ name: 'ResumeUploadPage' });

// Auth is handled by global middleware

// Profile completeness check
const { isComplete: isProfileComplete } = useProfile();
const showProfileModal = ref(false);

const uploadError = ref<Error | null>(null);
const isUploading = ref(false);

/**
 * Handle upload start
 */
const handleUpload = (_file: File) => {
  isUploading.value = true;
  uploadError.value = null;
};

/**
 * Handle upload success
 */
const handleSuccess = (resume: Resume) => {
  isUploading.value = false;
  // Navigate to the detail page
  navigateTo(`/resumes/${resume.id}`);
};

/**
 * Handle upload error
 */
const handleError = (error: Error) => {
  isUploading.value = false;
  uploadError.value = error;
};

/**
 * Go back to list
 */
</script>
