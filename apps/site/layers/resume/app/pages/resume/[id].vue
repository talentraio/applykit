<template>
  <div class="resume-page">
    <!-- Loading State -->
    <BasePageLoading v-if="pageLoading" show-text wrapper-class="resume-page__loading" />

    <!-- Has Resume: Show Editor Layout -->
    <ResumeEditorLayout
      v-else-if="hasResume"
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
      <!-- Left: Resume Selector + Editor Tabs -->
      <template #left>
        <div class="resume-page__left-panel">
          <ResumeEditorSelector
            v-if="showSelector"
            :resume-id="resumeId"
            :resume-list="store.resumeList"
            class="resume-page__selector"
          />

          <ResumeEditorTools
            v-model="activeTab"
            v-model:content="contentModel"
            v-model:settings="settingsModel"
            :items="tabItems"
            :preview-type="previewType"
            :show-upload-new="true"
            :resume-id="resumeId"
            :resume-name="activeResumeName"
            :is-default-resume="isDefaultResume"
            class="resume-page__tools"
            @upload-new="handleOpenUploadModal"
            @duplicate="handleDuplicate"
            @delete="handleDeleteResume"
          />
        </div>
      </template>
    </ResumeEditorLayout>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Editor Page (dynamic route)
 *
 * Loads a specific resume by ID and shows the editor layout.
 * If resume not found (404), redirects to /resume.
 *
 * Features:
 * - Load resume by ID
 * - Edit with live preview
 * - Format settings (ATS/Human)
 * - Undo/redo history
 * - Auto-save with debounce
 * - Duplicate resume
 *
 * Related: T025 (US1)
 */

import type { ResumeContent, SpacingSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';
import { toH3Error } from '@int/npm-utils';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { RESUME_EDITOR_TABS_MAP } from '@site/resume/app/constants';

defineOptions({ name: 'ResumeIdPage' });

// Use editor layout (no footer) for full-screen editing experience
definePageMeta({
  layout: 'editor',
  key: 'resume-editor'
});

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const resumeId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

const store = useResumeStore();

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
  updateContent,
  undo,
  redo,
  setPreviewType,
  updateSettings,
  discardChanges
} = useResume();

// UI State
const activeTab = ref(RESUME_EDITOR_TABS_MAP.EDIT);
const { openUploadModal, openCreateFromScratchModal, openDeleteConfirmModal } = useResumeModals();
const activeResumeName = computed(() => store.activeResume?.name ?? null);
const isDefaultResume = computed(() => store.activeResume?.isDefault ?? false);
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
const tabItems = computed(() => {
  return [
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
  ] satisfies ResumeEditorTabItem[];
});

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

// Fetch resume by ID (includes formatSettings in payload)
const { pending } = await useAsyncData(
  `resume-page`,
  async () => {
    const [resumeResult, listResult] = await Promise.allSettled([
      store.fetchResumeById(resumeId.value),
      store.fetchResumeList()
    ]);

    if (resumeResult.status === 'rejected') {
      const error = resumeResult.reason;
      const h3Error = toH3Error(error);

      // If resume not found or access denied, redirect to /resume
      if (h3Error && (h3Error.statusCode === 404 || h3Error.statusCode === 403)) {
        await navigateTo('/resume', { replace: true });
        return false;
      }

      showErrorToast(t('resume.error.fetchFailed'), error);
      return false;
    }

    return listResult.status !== 'rejected';
  },
  { watch: [resumeId] }
);

const pageLoading = computed(() => !hasResume.value && pending.value);
const showSelector = computed(() => store.resumeList.length > 1);

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

const handleOpenUploadModal = async () => {
  const result = await openUploadModal({
    onError: handleUploadError,
    replaceResumeId: resumeId.value
  });

  if (result?.action === 'uploaded') {
    if (result.resume.id !== resumeId.value) {
      await navigateTo(`/resume/${result.resume.id}`);
    }
  } else if (result?.action === 'create-from-scratch') {
    await openCreateFromScratchModal({
      replaceResumeId: resumeId.value
    });
  }
};

/**
 * Handle duplicate resume
 */
const handleDuplicate = async () => {
  const currentId = resumeId.value;
  if (!currentId) return;

  try {
    const newResume = await store.duplicateResume(currentId);
    toast.add({
      title: t('resume.page.resumeDuplicated'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    await navigateTo(`/resume/${newResume.id}`);
  } catch (error) {
    showErrorToast(t('resume.error.createFailed'), error);
  }
};

/**
 * Handle delete non-default resume
 */
const handleDeleteResume = async () => {
  const currentId = resumeId.value;
  if (!currentId) return;

  const result = await openDeleteConfirmModal();
  if (result?.action !== 'confirmed') {
    return;
  }

  try {
    await store.deleteResume(currentId);
    toast.add({
      title: t('resume.page.resumeDeleted'),
      color: 'success',
      icon: 'i-lucide-check'
    });

    const nextResumeId = store.defaultResumeId ?? store.resumeList[0]?.id;
    if (nextResumeId) {
      await navigateTo(`/resume/${nextResumeId}`, { replace: true });
      return;
    }

    await navigateTo('/resume', { replace: true });
  } catch (error) {
    showErrorToast(t('resume.error.deleteFailed'), error);
  }
};
</script>

<style lang="scss">
.resume-page {
  // Full height minus header (uses CSS variable from main.css)
  height: calc(100vh - var(--layout-header-height, 64px));

  &__left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  &__selector {
    flex-shrink: 0;
  }

  &__tools {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }
}
</style>
