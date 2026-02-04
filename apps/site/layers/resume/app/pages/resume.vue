<template>
  <div class="resume-page">
    <!-- Loading State -->
    <div v-if="loading" class="resume-page__loading">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
      <p class="mt-4 text-muted">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.fetchFailed')"
      :description="error.message"
      class="m-4"
    />

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
      :photo-url="photoUrl"
    >
      <!-- Left: Editor Tabs -->
      <template #left>
        <ResumeEditorTools
          v-model="activeTab"
          v-model:content="contentModel"
          v-model:settings="settingsModel"
          :items="tabItems"
          :preview-type="previewType"
          @upload-new="isUploadModalOpen = true"
        />
      </template>

      <template #right-actions>
        <BaseDownloadPdf
          v-if="content"
          :content="content"
          :settings="{ ats: atsSettings, human: humanSettings }"
          :photo-url="photoUrl"
          size="sm"
        />
      </template>

      <!-- Footer: Undo/Redo -->
      <template #footer>
        <div class="resume-page__footer">
          <BaseUndoRedoControls
            :can-undo="canUndo"
            :can-redo="canRedo"
            :history-length="historyLength"
            show-count
            @undo="undo"
            @redo="redo"
          />

          <div class="flex items-center gap-2">
            <UButton
              v-if="isDirty"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="discardChanges"
            >
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Mobile Preview (T053) -->
      <template #mobile-preview>
        <ResumePreviewFloatButton @click="isMobilePreviewOpen = true" />
        <ResumePreviewOverlay
          v-model:open="isMobilePreviewOpen"
          v-model:preview-type="previewTypeModel"
          :content="content"
          :settings="{ ats: atsSettings, human: humanSettings }"
          :photo-url="photoUrl"
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
    <ResumeModalCreateFromScratch
      v-model:open="isCreateModalOpen"
      :loading="loading"
      @confirm="handleCreateEmpty"
    />
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

import type { Resume, ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';

defineOptions({ name: 'ResumePage' });

// Use editor layout (no footer) for full-screen editing experience
definePageMeta({
  layout: 'editor'
});

// Auth is handled by global middleware (auth.global.ts)

const { t } = useI18n();
const toast = useToast();
const { profile } = useProfile();

// Resume composable with auto-save
const {
  hasResume,
  content,
  editingContent,
  loading,
  error,
  isDirty,
  previewType,
  currentSettings,
  atsSettings,
  humanSettings,
  canUndo,
  canRedo,
  historyLength,
  fetchResume,
  createFromContent,
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
const isMobilePreviewOpen = ref(false);
const activeTab = ref('edit');
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
const settingsModel = computed<ResumeFormatSettings>({
  get: () => currentSettings.value,
  set: value => updateSettings(value)
});

// Tab items
const tabItems = computed(
  () =>
    [
      {
        label: t('resume.tabs.edit'),
        value: 'edit',
        icon: 'i-lucide-pencil'
      },
      {
        label: t('resume.tabs.settings'),
        value: 'settings',
        icon: 'i-lucide-settings'
      },
      {
        label: t('resume.tabs.ai'),
        value: 'ai',
        icon: 'i-lucide-sparkles'
      }
    ] satisfies ResumeEditorTabItem[]
);

// Photo URL from profile
const photoUrl = computed(() => profile.value?.photoUrl ?? undefined);

// Fetch resume on mount
await callOnce('resume-page', async () => {
  await fetchResume();
});

/**
 * Handle content update from form
 */
/**
 * Handle upload success
 */
function handleUploadSuccess(_resume: Resume) {
  isUploadModalOpen.value = false;
  toast.add({
    title: t('resume.upload.success'),
    color: 'success',
    icon: 'i-lucide-check'
  });
}

/**
 * Handle upload error
 */
function handleUploadError(err: Error) {
  toast.add({
    title: t('resume.error.uploadFailed'),
    description: err.message,
    color: 'error',
    icon: 'i-lucide-alert-circle'
  });
}

/**
 * Handle create from scratch click
 */
function handleCreateFromScratch() {
  isUploadModalOpen.value = false;
  isCreateModalOpen.value = true;
}

/**
 * Create empty resume
 * Uses profile data when available, otherwise uses placeholder values that pass schema validation
 */
async function handleCreateEmpty() {
  // Build fullName from profile or use placeholder
  const fullName = profile.value?.firstName
    ? `${profile.value.firstName} ${profile.value.lastName ?? ''}`.trim()
    : t('resume.placeholder.fullName');

  // Use profile email or placeholder
  const email = profile.value?.email || 'your.email@example.com';

  const emptyContent: ResumeContent = {
    personalInfo: {
      fullName,
      email
    },
    experience: [],
    education: [],
    skills: [{ type: t('resume.placeholder.skillType'), skills: [t('resume.placeholder.skill')] }]
  };

  try {
    await createFromContent(emptyContent, 'My Resume');
    isCreateModalOpen.value = false;
    toast.add({
      title: t('resume.success.created'),
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch {
    // Error handled in composable
  }
}
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

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
