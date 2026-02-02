<template>
  <div class="vacancy-detail-page">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('vacancy.error.fetchDetailFailed')"
      :description="error.message"
      class="m-4"
    >
      <template #actions>
        <UButton variant="ghost" @click="goToList">{{ $t('common.back') }}</UButton>
      </template>
    </UAlert>

    <!-- Content -->
    <template v-else-if="vacancy">
      <!-- Two-Column Layout when editing generation (T045) -->
      <ResumeEditorLayout v-if="isEditingGeneration && latestGeneration">
        <!-- Header: Actions -->
        <template #header>
          <div class="vacancy-detail-page__header">
            <div class="flex items-center gap-4">
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-arrow-left"
                @click="stopEditingGeneration"
              >
                {{ $t('common.back') }}
              </UButton>
              <h1 class="text-xl font-semibold">{{ $t('vacancy.detail.editResume') }}</h1>
              <UBadge v-if="isGenerationDirty" color="warning" variant="soft">
                {{ $t('resume.editor.unsavedChanges') }}
              </UBadge>
            </div>

            <div class="flex items-center gap-2">
              <UButton variant="ghost" color="neutral" @click="stopEditingGeneration">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton
                color="primary"
                icon="i-lucide-save"
                :loading="savingGeneration"
                :disabled="!isGenerationDirty"
                @click="handleSaveGeneration"
              >
                {{ $t('common.save') }}
              </UButton>
            </div>
          </div>
        </template>

        <!-- Left: Resume Form -->
        <template #left>
          <div class="p-4">
            <ResumeForm
              v-if="editingGenerationContent"
              :model-value="editingGenerationContent"
              :resume-id="latestGeneration.resumeId"
              :saving="savingGeneration"
              @update:model-value="handleGenerationContentUpdate"
              @save="handleSaveGeneration"
            />
          </div>
        </template>

        <!-- Right: Preview with type toggle (T047) -->
        <template #right>
          <div class="vacancy-detail-page__preview">
            <div class="vacancy-detail-page__preview-header">
              <!-- Preview Type Toggle (T047) -->
              <UButtonGroup size="sm">
                <UButton
                  :color="previewType === 'ats' ? 'primary' : 'neutral'"
                  :variant="previewType === 'ats' ? 'solid' : 'outline'"
                  @click="setPreviewType('ats')"
                >
                  {{ $t('resume.settings.previewType.ats') }}
                </UButton>
                <UButton
                  :color="previewType === 'human' ? 'primary' : 'neutral'"
                  :variant="previewType === 'human' ? 'solid' : 'outline'"
                  @click="setPreviewType('human')"
                >
                  {{ $t('resume.settings.previewType.human') }}
                </UButton>
              </UButtonGroup>
            </div>
            <div class="vacancy-detail-page__preview-content">
              <ResumePreview
                v-if="displayGenerationContent"
                :content="displayGenerationContent"
                :type="previewType"
                :settings="currentSettings"
              />
            </div>
          </div>
        </template>

        <!-- Footer: Undo/Redo (T048) -->
        <template #footer>
          <div class="vacancy-detail-page__footer">
            <BaseUndoRedoControls
              :can-undo="canUndoGeneration"
              :can-redo="canRedoGeneration"
              :history-length="generationHistoryLength"
              show-count
              @undo="undoGeneration"
              @redo="redoGeneration"
            />

            <div class="flex items-center gap-2">
              <UButton
                v-if="isGenerationDirty"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="discardGenerationChanges"
              >
                {{ $t('common.cancel') }}
              </UButton>
              <UButton
                color="primary"
                size="sm"
                :loading="savingGeneration"
                :disabled="!isGenerationDirty"
                @click="handleSaveGeneration"
              >
                {{ $t('common.save') }}
              </UButton>
            </div>
          </div>
        </template>

        <!-- Mobile Preview (T054) -->
        <template #mobile-preview>
          <ResumePreviewFloatButton @click="isMobilePreviewOpen = true" />
          <ResumePreviewOverlay
            v-model:open="isMobilePreviewOpen"
            :content="displayGenerationContent"
            :preview-type="previewType"
            :settings="currentSettings"
            :show-download="false"
            @update:preview-type="setPreviewType"
          />
        </template>
      </ResumeEditorLayout>

      <!-- Standard single-column view -->
      <div v-else class="container mx-auto max-w-4xl p-4 py-8">
        <!-- Header -->
        <VacancyItemContentHeader
          :vacancy="vacancy"
          :is-edit-mode="isEditMode"
          @back="goToList"
          @toggle-edit="toggleEditMode"
          @delete="confirmDelete"
        />

        <!-- Edit Vacancy Mode: Form -->
        <UPageCard v-if="isEditMode">
          <VacancyForm
            :vacancy="vacancy"
            :saving="isSaving"
            show-cancel
            @save="handleUpdate"
            @cancel="toggleEditMode"
          />
        </UPageCard>

        <!-- View Mode: Details -->
        <div v-else class="space-y-6">
          <!-- Generation Section with Edit Resume Button (T046) -->
          <UPageCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">
                  {{ $t('vacancy.detail.tailoredResume') }}
                </h2>
                <UButton
                  v-if="latestGeneration"
                  variant="outline"
                  icon="i-lucide-pencil"
                  size="sm"
                  @click="startEditingGeneration"
                >
                  {{ $t('vacancy.detail.editResume') }}
                </UButton>
              </div>
            </template>

            <VacancyItemContentViewGeneration
              :vacancy-id="vacancyId"
              :latest-generation="latestGeneration ?? null"
              :generation-pending="generationPending"
              :is-generating="isGenerating"
              :has-resume="hasResume"
              :generation-error="generationError"
              @generate="handleGenerate"
            />
          </UPageCard>

          <!-- Company & Position -->
          <UPageCard>
            <template #header>
              <h2 class="text-lg font-semibold">
                {{ $t('vacancy.detail.company') }}
              </h2>
            </template>
            <div class="space-y-2">
              <p class="text-lg font-medium">{{ vacancy.company }}</p>
              <p v-if="vacancy.jobPosition" class="text-muted">
                {{ vacancy.jobPosition }}
              </p>
              <p v-else class="text-sm text-muted">
                {{ $t('vacancy.detail.noPosition') }}
              </p>
            </div>
          </UPageCard>

          <!-- Description -->
          <UPageCard>
            <template #header>
              <h2 class="text-lg font-semibold">
                {{ $t('vacancy.detail.description') }}
              </h2>
            </template>
            <div class="whitespace-pre-wrap text-sm">
              {{ vacancy.description }}
            </div>
          </UPageCard>

          <!-- URL -->
          <UPageCard v-if="vacancy.url">
            <template #header>
              <h2 class="text-lg font-semibold">
                {{ $t('vacancy.detail.url') }}
              </h2>
            </template>
            <ULink :to="vacancy.url" target="_blank" class="flex items-center gap-2 text-primary">
              <UIcon name="i-lucide-external-link" class="h-4 w-4" />
              {{ vacancy.url }}
            </ULink>
          </UPageCard>

          <!-- Notes -->
          <UPageCard v-if="vacancy.notes">
            <template #header>
              <h2 class="text-lg font-semibold">
                {{ $t('vacancy.detail.notes') }}
              </h2>
            </template>
            <div class="whitespace-pre-wrap text-sm text-muted">
              {{ vacancy.notes }}
            </div>
          </UPageCard>
        </div>
      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <VacancyModalDeleteConfirmation
      v-model:open="isDeleteModalOpen"
      :loading="isDeleting"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Detail Page
 *
 * Shows details of a specific vacancy with edit and delete actions.
 * After generation: Two-column layout with ResumeEditorLayout for editing.
 *
 * Features:
 * - View vacancy details
 * - Edit vacancy form
 * - Generate tailored resume
 * - Edit generated resume with two-column layout (T045)
 * - Preview type toggle ATS/Human (T047)
 * - Undo/redo for generation editing (T048)
 * - Mobile preview float button and overlay (T054)
 *
 * Related: T103 (US4), T045, T046, T047, T048 (US4), T054 (US5)
 */

import type { ResumeContent, VacancyInput } from '@int/schema';

defineOptions({ name: 'VacancyDetailPage' });

// Auth is handled by global middleware

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Get vacancy ID from route
const vacancyId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

// Use vacancy store via composable
const { current: vacancy, fetchVacancy, updateVacancy, deleteVacancy } = useVacancies();

// Use generations composable
const { generate, getLatestGeneration } = useGenerations();

// Use vacancy store for generation editing (T043, T044)
const vacancyStore = useVacancyStore();

// Generation editing state from store
const isEditingGeneration = computed(() => vacancyStore.isEditingGeneration);
const editingGenerationContent = computed(() => vacancyStore.editingGenerationContent);
const displayGenerationContent = computed(() => vacancyStore.displayGenerationContent);
const isGenerationDirty = computed(() => vacancyStore.isGenerationDirty);
const savingGeneration = computed(() => vacancyStore.savingGeneration);
const previewType = computed(() => vacancyStore.previewType);
const currentSettings = computed(() => vacancyStore.currentSettings);
const canUndoGeneration = computed(() => vacancyStore.canUndoGeneration);
const canRedoGeneration = computed(() => vacancyStore.canRedoGeneration);
const generationHistoryLength = computed(() => vacancyStore.generationHistoryLength);

// Fetch vacancy (SSR-compatible)
const { pending, error } = await useAsyncData(`vacancy-${vacancyId.value}`, () => {
  return fetchVacancy(vacancyId.value);
});

// Fetch latest generation
const {
  data: latestGeneration,
  pending: generationPending,
  refresh: refreshGeneration
} = await useAsyncData(`generation-${vacancyId.value}`, () => getLatestGeneration(vacancyId.value));

// Initialize generation in store when it changes
watch(
  latestGeneration,
  generation => {
    if (generation && !isEditingGeneration.value) {
      vacancyStore.setCurrentGeneration(generation);
    }
  },
  { immediate: true }
);

// Edit mode state
const isEditMode = ref(route.query.edit === 'true');

// Action states
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const isGenerating = ref(false);
const isMobilePreviewOpen = ref(false);
const generationError = ref<string | null>(null);
const hasResume = ref(true); // TODO: Check if user has at least one resume

// =========================================
// Vacancy Edit Mode
// =========================================

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  // Update URL query without navigation
  if (isEditMode.value) {
    router.replace({ query: { edit: 'true' } });
  } else {
    router.replace({ query: {} });
  }
};

const handleUpdate = async (data: VacancyInput) => {
  if (!vacancy.value) return;

  isSaving.value = true;

  try {
    await updateVacancy(vacancy.value.id, data);

    toast.add({
      title: `${t('common.update')} ${t('common.success').toLowerCase()}`,
      color: 'success'
    });

    isEditMode.value = false;
    router.replace({ query: {} });
  } catch (err) {
    toast.add({
      title: t('vacancy.error.updateFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isSaving.value = false;
  }
};

// =========================================
// Generation Edit Mode (T045, T046, T047, T048)
// =========================================

function startEditingGeneration() {
  if (latestGeneration.value) {
    vacancyStore.setCurrentGeneration(latestGeneration.value);
    vacancyStore.startEditingGeneration();
  }
}

function stopEditingGeneration() {
  vacancyStore.stopEditingGeneration();
}

function handleGenerationContentUpdate(content: ResumeContent) {
  vacancyStore.updateGenerationContent(content);
}

async function handleSaveGeneration() {
  try {
    await vacancyStore.saveGenerationContent();
    toast.add({
      title: t('resume.success.updated'),
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch {
    toast.add({
      title: t('resume.error.updateFailed'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  }
}

function setPreviewType(type: 'ats' | 'human') {
  vacancyStore.setPreviewType(type);
}

function undoGeneration() {
  vacancyStore.undoGeneration();
}

function redoGeneration() {
  vacancyStore.redoGeneration();
}

function discardGenerationChanges() {
  vacancyStore.discardGenerationChanges();
}

// =========================================
// Delete
// =========================================

const confirmDelete = () => {
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!vacancy.value) return;

  isDeleting.value = true;

  try {
    await deleteVacancy(vacancy.value.id);

    toast.add({
      title: t('vacancy.delete.success'),
      color: 'success'
    });

    // Navigate back to list
    await navigateTo('/vacancies');
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
    isDeleteModalOpen.value = false;
  } finally {
    isDeleting.value = false;
  }
};

const goToList = () => {
  navigateTo('/vacancies');
};

// =========================================
// Generation
// =========================================

const handleGenerate = async () => {
  generationError.value = null;
  isGenerating.value = true;

  try {
    await generate(vacancyId.value);

    toast.add({
      title: t('generation.success'),
      color: 'success'
    });

    // Refresh latest generation
    await refreshGeneration();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : t('generation.error.generic');
    generationError.value = errorMessage;

    toast.add({
      title: t('generation.error.generationFailed'),
      description: errorMessage,
      color: 'error'
    });
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style lang="scss">
.vacancy-detail-page {
  height: 100%;
  min-height: calc(100vh - 64px);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__preview {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  &__preview-header {
    flex-shrink: 0;
    padding: 0.5rem 0;
    display: flex;
    justify-content: center;
  }

  &__preview-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
