<template>
  <div class="vacancy-resume-page">
    <!-- Loading State -->
    <div v-if="loading" class="vacancy-resume-page__loading">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
      <p class="mt-4 text-muted">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('vacancy.resume.fetchFailed')"
      :description="error.message"
      class="m-4"
    />

    <!-- No Generation -->
    <div v-else-if="!generation" class="vacancy-resume-page__empty">
      <UIcon name="i-lucide-file-text" class="h-16 w-16 text-muted" />
      <h2 class="mt-4 text-xl font-semibold">{{ $t('vacancy.resume.noGeneration') }}</h2>
      <p class="mt-2 text-muted">{{ $t('vacancy.resume.generateFirst') }}</p>
      <UButton class="mt-6" icon="i-lucide-arrow-left" :to="`/vacancies/${vacancyId}/overview`">
        {{ $t('vacancy.resume.backToOverview') }}
      </UButton>
    </div>

    <!-- Has Generation: Show Editor Layout (T036-T037) -->
    <ResumeEditorLayout
      v-else
      v-model:preview-type="previewType"
      :preview-content="content"
      :preview-settings="currentSettings"
      :photo-url="photoUrl"
    >
      <!-- No header slot - clean layout (T037) -->

      <!-- Left: Editor Form -->
      <template #left>
        <ResumeEditorTools
          v-model="activeTab"
          v-model:content="contentModel"
          v-model:settings="settingsModel"
          :items="tabItems"
          :preview-type="previewType"
        />
      </template>

      <!-- Right Actions: Download PDF -->
      <template #right-actions>
        <BaseDownloadPdf
          v-if="content"
          :content="content"
          :settings="{ ats: atsSettings, human: humanSettings }"
          :photo-url="photoUrl"
          size="sm"
        />
      </template>

      <!-- Footer: Undo/Redo + Saving Indicator (T038, T039) -->
      <template #footer>
        <div class="vacancy-resume-page__footer">
          <BaseUndoRedoControls :can-undo="canUndo" :can-redo="canRedo" @undo="undo" @redo="redo" />

          <div class="flex items-center gap-2">
            <!-- Saving Indicator (T039) -->
            <div v-if="saving" class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
              <span>{{ $t('vacancy.resume.saving') }}</span>
            </div>

            <!-- Discard Changes Button -->
            <UButton
              v-if="isDirty && !saving"
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

      <!-- Mobile Preview -->
      <template #mobile-preview>
        <ResumePreviewFloatButton @click="isMobilePreviewOpen = true" />
        <ResumePreviewOverlay
          v-model:open="isMobilePreviewOpen"
          v-model:preview-type="previewType"
          :content="content"
          :settings="{ ats: atsSettings, human: humanSettings }"
          :photo-url="photoUrl"
        />
      </template>
    </ResumeEditorLayout>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Resume Sub-Page
 *
 * Edits the generated resume content for a vacancy.
 * Uses ResumeEditorLayout with auto-save and undo/redo.
 *
 * Features:
 * - Clean layout (no header with Back/Cancel/Save)
 * - Auto-save via watchDebounced (2000ms)
 * - Undo/redo controls in footer
 * - Toast feedback for save status
 *
 * Related: T036-T039 (US4)
 */

import type { ResumeContent, SpacingSettings, Vacancy } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'VacancyResumePage' });

defineProps<{
  /**
   * Vacancy data passed from parent layout
   */
  vacancy: Vacancy;
}>();

// Use editor layout for full-screen editing experience (no footer)
definePageMeta({
  layout: 'editor'
});

const route = useRoute();
const { t } = useI18n();
const { profile } = useProfile();

// Extract vacancy ID
const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

// Vacancy generation composable with auto-save
const {
  generation,
  content,
  loading,
  saving,
  error,
  isDirty,
  previewType: composablePreviewType,
  currentSettings,
  atsSettings,
  humanSettings,
  canUndo,
  canRedo,
  fetchGeneration,
  fetchSettings,
  updateContent,
  updateSettings,
  setPreviewType,
  undo,
  redo,
  discardChanges
} = useVacancyGeneration(vacancyId.value);

// UI State
const activeTab = ref('edit');
const previewType = computed<PreviewType>({
  get: () => composablePreviewType.value,
  set: value => setPreviewType(value)
});
const isMobilePreviewOpen = ref(false);
const settingsModel = computed<SpacingSettings>({
  get: () => currentSettings.value.spacing,
  set: value => {
    const key =
      composablePreviewType.value === EXPORT_FORMAT_MAP.ATS
        ? EXPORT_FORMAT_MAP.ATS
        : EXPORT_FORMAT_MAP.HUMAN;
    updateSettings({ [key]: { spacing: value } });
  }
});

// Tab items (only Edit, no Settings or AI for generation editing)
const tabItems = computed(
  () =>
    [
      {
        label: t('resume.tabs.edit'),
        value: 'edit',
        icon: 'i-lucide-pencil'
      }
    ] satisfies ResumeEditorTabItem[]
);

// Photo URL from profile
const photoUrl = computed(() => profile.value?.photoUrl ?? undefined);

// Content model for two-way binding with form
const contentModel = computed<ResumeContent | null>({
  get: () => content.value,
  set: value => {
    if (value) updateContent(value);
  }
});

// Fetch generation and settings on mount
await callOnce(`vacancy-resume-${vacancyId.value}`, async () => {
  await Promise.all([fetchGeneration(), fetchSettings()]);
});
</script>

<style lang="scss">
.vacancy-resume-page {
  // Full height minus header
  height: calc(100vh - var(--layout-header-height, 64px));

  &__loading,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    padding: 2rem;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
