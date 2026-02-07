<template>
  <div class="resume-page">
    <!-- Loading State -->
    <div v-if="pageLoading" class="resume-page__loading">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />

      <p class="mt-4 text-muted">{{ $t('common.loading') }}</p>
    </div>

    <!-- No Resume: Show Upload Form -->
    <div v-else-if="!hasResume" class="resume-page__upload">
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

    <!-- Has Resume: Show Editor Layout -->
    <ResumeEditorLayout
      v-else
      v-model:preview-type="previewTypeModel"
      :preview-content="content"
      :preview-settings="currentSettings"
      :export-settings="{ ats: atsSettings, human: humanSettings }"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dirty="isDirty"
      @undo="undo"
      @redo="redo"
      @discard="discardChanges"
    >
      <!-- Left: Editor Tabs -->
      <template #left>
        <ResumeEditorTools
          v-model="activeTab"
          v-model:content="contentModel"
          v-model:settings="settingsModel"
          :items="tabItems"
          :preview-type="previewType"
          :show-upload-new="true"
          @upload-new="isUploadModalOpen = true"
        />
      </template>
    </ResumeEditorLayout>

    <!-- Upload Modal -->
    <ResumeModalUpload
      v-model:open="isUploadModalOpen"
      @success="handleUploadSuccess"
      @error="handleUploadError"
      @create-from-scratch="handleCreateFromScratch"
    />

    <!-- Create From Scratch Modal -->
    <ResumeModalCreateFromScratch v-model:open="isCreateModalOpen" />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Page
 *
 * Single resume page with conditional rendering:
 * - No resume: Show upload form
 * - Has resume: Show EditorLayout with tabs (Edit, Settings, AI)
 *
 * Features:
 * - Upload/create resume
 * - Edit with live preview
 * - Format settings (ATS/Human)
 * - Undo/redo history
 * - Auto-save with debounce
 * - Mobile preview float button and overlay (T053)
 *
 * Related: T038 (US3), T053 (US5)
 */

import type { Resume, ResumeContent, SpacingSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { RESUME_EDITOR_TABS_MAP } from '@site/resume/app/constants';

defineOptions({ name: 'ResumePage' });

// Use editor layout (no footer) for full-screen editing experience
definePageMeta({
  layout: 'editor'
});

// Auth is handled by global middleware (auth.global.ts)

const { t } = useI18n();
const toast = useToast();

// Resume composable with auto-save
const {
  hasResume,
  content,
  editingContent,
  isDirty,
  previewType,
  currentSettings,
  atsSettings,
  humanSettings,
  canUndo,
  canRedo,
  fetchResume,
  fetchSettings,
  updateContent,
  undo,
  redo,
  setPreviewType,
  updateSettings,
  discardChanges
} = useResume();

// UI State
const isUploadModalOpen = ref(false);
const isCreateModalOpen = ref(false);
const activeTab = ref(RESUME_EDITOR_TABS_MAP.EDIT);
const previewTypeModel = computed<PreviewType>({
  get: () => previewType.value,
  set: value => setPreviewType(value)
});
const contentModel = computed<ResumeContent | null>({
  get: () => editingContent.value,
  set: value => {
    if (value) updateContent(value);
  }
});
const settingsModel = computed<SpacingSettings>({
  get: () => currentSettings.value.spacing,
  set: value => {
    const key =
      previewType.value === EXPORT_FORMAT_MAP.ATS ? EXPORT_FORMAT_MAP.ATS : EXPORT_FORMAT_MAP.HUMAN;
    updateSettings({ [key]: { spacing: value } });
  }
});

// Tab items
const tabItems = computed(
  () =>
    [
      {
        label: t('resume.tabs.edit'),
        value: RESUME_EDITOR_TABS_MAP.EDIT,
        icon: 'i-lucide-pencil'
      },
      {
        label: t('resume.tabs.settings'),
        value: RESUME_EDITOR_TABS_MAP.SETTINGS,
        icon: 'i-lucide-settings'
      },
      {
        label: t('resume.tabs.ai'),
        value: RESUME_EDITOR_TABS_MAP.AI,
        icon: 'i-lucide-sparkles'
      }
    ] satisfies ResumeEditorTabItem[]
);

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

// Fetch resume and settings on mount
const { pending } = await useAsyncData('resume-page', async () => {
  const [resumeResult, settingsResult] = await Promise.allSettled([fetchResume(), fetchSettings()]);

  if (resumeResult.status === 'rejected') {
    showErrorToast(t('resume.error.fetchFailed'), resumeResult.reason);
  }

  if (settingsResult.status === 'rejected') {
    showErrorToast(t('resume.error.settingsUpdateFailed'), settingsResult.reason);
  }

  return resumeResult.status === 'fulfilled' && settingsResult.status === 'fulfilled';
});
const pageLoading = computed(() => !hasResume.value && pending.value);

/**
 * Handle upload success
 */
const handleUploadSuccess = (_resume: Resume) => {
  isUploadModalOpen.value = false;
  toast.add({
    title: t('resume.upload.success'),
    color: 'success',
    icon: 'i-lucide-check'
  });
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
  isUploadModalOpen.value = false;
  isCreateModalOpen.value = true;
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
