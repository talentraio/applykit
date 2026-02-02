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
    <ResumeEditorLayout v-else>
      <!-- Header: Actions -->
      <template #header>
        <div class="resume-page__header">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold">{{ $t('resume.page.editTitle') }}</h1>
            <UBadge v-if="isDirty" color="warning" variant="soft">
              {{ $t('resume.editor.unsavedChanges') }}
            </UBadge>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-upload"
              @click="isUploadModalOpen = true"
            >
              {{ $t('resume.page.uploadNew') }}
            </UButton>
            <UDropdownMenu :items="downloadMenuItems">
              <UButton
                color="primary"
                icon="i-lucide-download"
                trailing-icon="i-lucide-chevron-down"
              >
                {{ $t('export.button.download') }}
              </UButton>
            </UDropdownMenu>
          </div>
        </div>
      </template>

      <!-- Left: Editor Tabs -->
      <template #left>
        <UTabs v-model="activeTab" :items="tabItems" class="resume-page__tabs">
          <template #content="{ item }">
            <!-- Edit Tab -->
            <div v-if="item.value === 'edit'" class="resume-page__tab-content">
              <ResumeForm
                v-if="editingContent"
                :model-value="editingContent"
                :resume-id="resume!.id"
                :saving="saving"
                @update:model-value="handleContentUpdate"
                @save="handleSave"
              />
            </div>

            <!-- Settings Tab -->
            <div v-else-if="item.value === 'settings'" class="resume-page__tab-content">
              <ResumeSettings
                :preview-type="previewType"
                :settings="currentSettings"
                :saving="saving"
                @update:preview-type="setPreviewType"
                @update:settings="updateSettings"
                @save="handleSaveSettings"
              />
            </div>

            <!-- AI Tab -->
            <div v-else-if="item.value === 'ai'" class="resume-page__tab-content">
              <ResumeTabAIEnhance />
            </div>
          </template>
        </UTabs>
      </template>

      <!-- Right: Preview -->
      <template #right>
        <div class="resume-page__preview">
          <div class="resume-page__preview-header">
            <span class="text-sm font-medium text-muted">
              {{
                previewType === 'ats' ? $t('resume.view.atsTitle') : $t('resume.view.humanTitle')
              }}
            </span>
          </div>
          <div class="resume-page__preview-content">
            <ResumePreview
              v-if="content"
              :content="content"
              :type="previewType"
              :settings="currentSettings"
              :photo-url="photoUrl"
            />
            <div v-else class="resume-page__preview-empty">
              <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
              <p class="mt-4 text-muted">{{ $t('resume.preview.empty') }}</p>
            </div>
          </div>
        </div>
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
            <UButton
              color="primary"
              size="sm"
              :loading="saving"
              :disabled="!isDirty"
              @click="handleSave"
            >
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Mobile Preview (T053) -->
      <template #mobile-preview>
        <ResumePreviewFloatButton @click="isMobilePreviewOpen = true" />
        <ResumePreviewOverlay
          v-model:open="isMobilePreviewOpen"
          :content="content"
          :preview-type="previewType"
          :settings="currentSettings"
          :photo-url="photoUrl"
          @update:preview-type="setPreviewType"
          @download="handleExport"
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
    <UModal v-model:open="isCreateModalOpen" :title="$t('resume.page.createTitle')">
      <template #body>
        <p class="mb-4 text-sm text-muted">
          {{ $t('resume.page.createDescription') }}
        </p>
        <UButton color="primary" block :loading="loading" @click="handleCreateEmpty">
          {{ $t('resume.page.createButton') }}
        </UButton>
      </template>
    </UModal>
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

import type { Resume, ResumeContent } from '@int/schema';
import type { PreviewType } from '../types/preview';

defineOptions({ name: 'ResumePage' });

// Auth is handled by global middleware (auth.global.ts)

const { t } = useI18n();
const toast = useToast();
const { profile } = useProfile();

// Resume composable with auto-save
const {
  resume,
  hasResume,
  content,
  editingContent,
  loading,
  saving,
  error,
  isDirty,
  previewType,
  currentSettings,
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
  saveSettings,
  discardChanges
} = useResume();

// UI State
const isUploadModalOpen = ref(false);
const isCreateModalOpen = ref(false);
const isMobilePreviewOpen = ref(false);
const activeTab = ref('edit');

// Tab items
const tabItems = computed(() => [
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
]);

// Download menu items
const downloadMenuItems = computed(() => [
  [
    {
      label: t('export.format.ats'),
      icon: 'i-lucide-file-text',
      onSelect: () => handleExport('ats')
    },
    {
      label: t('export.format.human'),
      icon: 'i-lucide-user',
      onSelect: () => handleExport('human')
    }
  ]
]);

// Photo URL from profile
const photoUrl = computed(() => profile.value?.photoUrl ?? undefined);

// Fetch resume on mount
await callOnce('resume-page', async () => {
  await fetchResume();
});

/**
 * Handle content update from form
 */
function handleContentUpdate(newContent: ResumeContent) {
  updateContent(newContent);
}

/**
 * Handle manual save
 */
async function handleSave() {
  // Save is handled by auto-save, but manual save can be triggered
  // The useResume composable handles the actual save
}

/**
 * Handle settings save
 */
async function handleSaveSettings() {
  try {
    await saveSettings();
  } catch {
    // Error handled in composable
  }
}

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

/**
 * Handle PDF export
 */
function handleExport(_type: PreviewType) {
  // TODO: Implement PDF export
  toast.add({
    title: t('export.inProgress'),
    color: 'primary',
    icon: 'i-lucide-loader-2'
  });
}
</script>

<style lang="scss">
.resume-page {
  // Fixed height for proper scrolling in child columns
  height: calc(100vh - 64px); // Subtract header height

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

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  &__preview {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  &__preview-header {
    flex-shrink: 0;
    padding: 0.5rem 0;
    text-align: center;
  }

  &__preview-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  &__preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
