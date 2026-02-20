<template>
  <div class="resume-page">
    <!-- Loading State -->
    <BasePageLoading v-if="pageLoading" show-text wrapper-class="resume-page__loading" />

    <!-- No Resume: Show Upload Form -->
    <div v-else-if="!redirecting" class="resume-page__upload">
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
 * Entry point for /resume route:
 * - If user has resumes → redirect to /resume/[defaultResumeId]
 * - If user has no resumes → show upload form
 *
 * After first resume creation, navigates to /resume/[newId].
 *
 * Related: T026 (US1)
 */

import type { Resume } from '@int/schema';

defineOptions({ name: 'ResumeIndexPage' });

definePageMeta({
  layout: 'editor'
});

const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const store = useResumeStore();
const { openCreateFromScratchModal } = useResumeModals();

const redirecting = ref(false);

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const showErrorToast = (title: string, error: unknown) => {
  if (!import.meta.client) return;

  toast.add({
    title,
    description: getErrorMessage(error),
    color: 'error',
    icon: 'i-lucide-alert-circle'
  });
};

// Check if user has resumes and redirect if so
const { pending } = await useAsyncData(
  'resume-index',
  async () => {
    try {
      // Fetch resume list to check if user has any resumes
      const items = await store.fetchResumeList();

      if (items.length > 0) {
        // Find default resume or use first one
        const defaultItem = items.find(r => r.isDefault);
        const targetId = defaultItem?.id ?? items[0]?.id;

        if (targetId) {
          redirecting.value = true;
          await navigateTo(`/resume/${targetId}`, { replace: true });
          return true;
        }
      }

      // No resumes — show upload form (no redirect)
      return true;
    } catch (error) {
      showErrorToast(t('resume.error.fetchFailed'), error);
      return false;
    }
  },
  {
    // Redirect decision must always reflect fresh data after create/delete/set-default flows.
    getCachedData: () => undefined
  }
);

const pageLoading = computed(() => pending.value);

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
  void router.push(`/resume/${resume.id}`);
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

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

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
