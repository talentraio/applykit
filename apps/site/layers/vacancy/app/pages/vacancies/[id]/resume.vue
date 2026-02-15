<template>
  <div class="vacancy-resume-page">
    <!-- Loading State -->
    <BasePageLoading v-if="pageLoading" show-text wrapper-class="vacancy-resume-page__loading" />

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
      :export-settings="{ ats: atsSettings, human: humanSettings }"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dirty="isDirty"
      @undo="undo"
      @redo="redo"
      @discard="handleDiscardChanges"
    >
      <template v-if="shouldShowScoreAlert" #header>
        <VacancyItemResumeScoreAlert
          :vacancy-id="vacancyId"
          :generation-id="generation!.id"
          :match-score-before="matchScoreBefore"
          :match-score-after="matchScoreAfter"
          @dismiss="handleDismissAlert"
        />
      </template>

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
 * - Debounced auto-save via useResumeEditHistory
 * - Undo/redo controls in footer
 * - Toast feedback for save status
 *
 * Related: T036-T039 (US4)
 */

import type { ResumeContent, SpacingSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'VacancyResumePage' });

// Use editor layout for full-screen editing experience (no footer)
definePageMeta({
  layout: 'editor'
});

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const _vacancyStore = useVacancyStore();

// Extract vacancy ID
const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

// Vacancy generation composable with auto-save
const {
  generation,
  content,
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
const tabItems = computed(() => {
  return [
    {
      label: t('resume.tabs.edit'),
      value: 'edit',
      icon: 'i-lucide-pencil'
    }
  ] satisfies ResumeEditorTabItem[];
});

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const showErrorToast = (title: string, error: unknown): void => {
  if (!import.meta.client) return;

  toast.add({
    title,
    description: getErrorMessage(error),
    color: 'error',
    icon: 'i-lucide-alert-circle'
  });
};

const handleDiscardChanges = async (): Promise<void> => {
  try {
    await discardChanges();
  } catch (error) {
    showErrorToast(t('vacancy.resume.fetchFailed'), error);
  }
};

// Content model for two-way binding with form
const contentModel = computed<ResumeContent | null>({
  get: () => content.value,
  set: value => {
    if (value) updateContent(value);
  }
});

const matchScoreBefore = computed(() => generation.value?.matchScoreBefore ?? 0);
const matchScoreAfter = computed(() => generation.value?.matchScoreAfter ?? 0);
// Show alert if generation exists and alert has not been dismissed for this generation
const shouldShowScoreAlert = computed(() => {
  if (!generation.value) return false;
  // Show alert if scoreAlertDismissedAt is null (never dismissed)
  // or if it was dismissed before the current generation was created (new generation)
  const dismissedAt = generation.value.scoreAlertDismissedAt;
  if (!dismissedAt) return true;
  return new Date(dismissedAt) < new Date(generation.value.generatedAt);
});

const handleDismissAlert = async (): Promise<void> => {
  if (!generation.value) return;

  try {
    await useApi(`/api/vacancies/${vacancyId.value}/generation/dismiss-score-alert`, {
      method: 'PATCH',
      body: { generationId: generation.value.id }
    });

    // Refresh generation to get updated scoreAlertDismissedAt
    await fetchGeneration();
  } catch (error) {
    showErrorToast(t('vacancy.resume.dismissAlertFailed'), error);
  }
};

// Fetch generation and settings on mount
const { pending } = await useAsyncData(`vacancy-resume-${vacancyId.value}`, async () => {
  const [generationResult, settingsResult] = await Promise.allSettled([
    fetchGeneration(),
    fetchSettings()
  ]);

  if (generationResult.status === 'rejected') {
    showErrorToast(t('vacancy.resume.fetchFailed'), generationResult.reason);
  }

  if (settingsResult.status === 'rejected') {
    showErrorToast(t('resume.error.settingsUpdateFailed'), settingsResult.reason);
  }

  return generationResult.status === 'fulfilled' && settingsResult.status === 'fulfilled';
});
const pageLoading = computed(() => !generation.value && pending.value);
</script>

<style lang="scss">
.vacancy-resume-page {
  height: 100%;
  min-height: 0;

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
}
</style>
