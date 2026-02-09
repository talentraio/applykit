<template>
  <div class="vacancy-overview container mx-auto max-w-4xl p-4 py-6">
    <!-- Edit Mode: Show VacancyForm -->
    <template v-if="isEditMode">
      <UPageCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ t('vacancy.form.editTitle') }}</h2>
        </template>

        <VacancyForm
          :vacancy="vacancy"
          :saving="isSaving"
          show-cancel
          @save="handleSave"
          @cancel="handleCancel"
        />
      </UPageCard>
    </template>

    <!-- View Mode: Show Overview Layout -->
    <template v-else>
      <!-- Title Row (T021) -->
      <div class="vacancy-overview__title-row mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-2xl font-bold">{{ vacancy.company }}</h1>
            <p v-if="vacancy.jobPosition" class="text-lg text-muted">
              {{ vacancy.jobPosition }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-pencil"
              :aria-label="t('vacancy.detail.actions.edit')"
              @click="handleToggleEdit"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :aria-label="t('vacancy.detail.actions.delete')"
              @click="handleDeleteClick"
            />
          </div>
        </div>
      </div>

      <!-- Meta Row (T022) -->
      <div
        class="vacancy-overview__meta-row mb-6 flex flex-wrap items-center gap-4 text-sm text-muted"
      >
        <span>{{ t('vacancy.overview.lastUpdated') }}: {{ formattedUpdatedAt }}</span>

        <div class="ml-auto flex w-full items-center justify-end gap-3 sm:w-auto">
          <UButton
            v-if="vacancy.url"
            variant="link"
            color="primary"
            size="xs"
            icon="i-lucide-external-link"
            :to="vacancy.url"
            target="_blank"
          >
            {{ t('vacancy.detail.url') }}
          </UButton>

          <VacancyStatusBadge
            :status="vacancy.status"
            :has-generation="hasGeneration"
            :loading="isUpdatingStatus"
            @change="handleStatusChange"
          />
        </div>
      </div>

      <!-- Actions Row (T023) -->
      <div class="vacancy-overview__actions-row mb-8 flex flex-wrap gap-3">
        <UButton
          :loading="isGenerating"
          :disabled="isGenerating"
          :icon="primaryActionIcon"
          size="lg"
          @click="handlePrimaryAction"
        >
          {{ primaryActionLabel }}
        </UButton>

        <UButton variant="outline" icon="i-lucide-mail" size="lg" disabled>
          {{ t('vacancy.overview.generateCoverLetter') }}
        </UButton>
      </div>

      <!-- Generation Error -->
      <UAlert
        v-if="generationError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="t('generation.error.generationFailed')"
        :description="generationError"
        class="mb-6"
      />

      <!-- Loading Generation -->
      <BasePageLoading v-if="generationPending" wrapper-class="py-8" />

      <!-- Match Score Block (T024) - Only if generation exists -->
      <template v-else-if="latestGeneration">
        <VacancyItemContentViewGenerationExistsMatchScoreDisplay
          :score-before="latestGeneration.matchScoreBefore"
          :score-after="latestGeneration.matchScoreAfter"
          class="mb-6"
        />

        <!-- Expires Block (T025) -->
        <VacancyItemContentViewGenerationExistsLifetimeIndicator
          :generation="latestGeneration"
          class="mb-6"
        />
      </template>

      <!-- Description Block (T026) -->
      <UPageCard class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('vacancy.detail.description') }}</h3>
        </template>

        <div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
          {{ vacancy.description }}
        </div>
      </UPageCard>

      <!-- Notes Block (T026) - Conditional -->
      <UPageCard v-if="vacancy.notes" class="mb-6">
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('vacancy.detail.notes') }}</h3>
        </template>

        <div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
          {{ vacancy.notes }}
        </div>
      </UPageCard>
    </template>

    <!-- Delete Confirmation Modal -->
    <VacancyModalDeleteConfirmation
      v-model:open="showDeleteModal"
      :vacancy-id="props.vacancy.id"
      @success="handleDeleteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Overview Page
 *
 * Main overview page for a vacancy showing:
 * - Title row with company name, position, edit/delete buttons
 * - Meta row with Last Updated, Vacancy page link, status badge
 * - Actions row with Generate buttons
 * - Conditional Match Score block (if generation exists)
 * - Conditional Expires block (generation expiry)
 * - Description and Notes blocks
 * - Inline edit mode with VacancyForm toggle
 *
 * Related: T020-T027 (US2)
 */

import type { Vacancy, VacancyInput, VacancyStatus } from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'VacancyOverviewPage' });

const props = defineProps<{
  /**
   * Vacancy data passed from parent layout
   */
  vacancy: Vacancy;
}>();

const router = useRouter();
const { t } = useI18n();
const toast = useToast();

// Store
const vacancyStore = useVacancyStore();

// --- State ---
const isEditMode = ref(false);
const isSaving = ref(false);
const isGenerating = ref(false);
const isUpdatingStatus = ref(false);
const generationError = ref<string | null>(null);
const showDeleteModal = ref(false);

// --- Generation Data ---
const {
  data,
  pending: generationPending,
  refresh: refreshGeneration
} = await useAsyncData<VacanciesResumeGeneration>(
  `overview-generation-${props.vacancy.id}`,
  () => vacancyStore.fetchLatestGeneration(props.vacancy.id),
  {
    default: () => ({
      isValid: true,
      generation: null
    })
  }
);

// --- Computed ---

const formattedUpdatedAt = computed(() => {
  const resolved =
    typeof props.vacancy.updatedAt === 'string'
      ? parseISO(props.vacancy.updatedAt)
      : props.vacancy.updatedAt;
  return format(resolved, 'MMM d, yyyy');
});

const latestGeneration = computed(() => data.value?.generation || null);
const hasGeneration = computed(() => latestGeneration.value !== null);
const primaryActionLabel = computed(() => {
  if (isGenerating.value) {
    return t('generation.inProgress');
  }

  return hasGeneration.value
    ? t('vacancy.overview.viewResume')
    : t('vacancy.overview.generateResume');
});
const primaryActionIcon = computed(() =>
  hasGeneration.value ? 'i-lucide-file-text' : 'i-lucide-sparkles'
);

// --- Event Handlers ---

/**
 * Toggle inline edit mode
 */
const handleToggleEdit = () => {
  isEditMode.value = !isEditMode.value;
};

/**
 * Handle vacancy form save
 */
const handleSave = async (data: VacancyInput) => {
  isSaving.value = true;

  try {
    await vacancyStore.updateVacancy(props.vacancy.id, data);
    isEditMode.value = false;

    toast.add({
      title: t('vacancy.form.success'),
      color: 'success'
    });
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

/**
 * Handle vacancy form cancel
 */
const handleCancel = () => {
  isEditMode.value = false;
};

/**
 * Open delete confirmation modal
 */
const handleDeleteClick = () => {
  showDeleteModal.value = true;
};

/**
 * Handle successful vacancy delete
 */
const handleDeleteSuccess = async () => {
  // Navigate back to vacancies list
  await router.push('/vacancies');
};

/**
 * Generate tailored resume
 */
const handleGenerate = async () => {
  isGenerating.value = true;
  generationError.value = null;

  try {
    await vacancyStore.generateResume(props.vacancy.id);
    await refreshGeneration();

    // Navigate to resume sub-page after successful generation
    await router.push(`/vacancies/${props.vacancy.id}/resume`);
  } catch (err) {
    generationError.value =
      err instanceof Error ? err.message : t('generation.error.generationFailed');
  } finally {
    isGenerating.value = false;
  }
};

/**
 * Handle primary action in the overview toolbar
 */
const handlePrimaryAction = async () => {
  if (hasGeneration.value) {
    await router.push(`/vacancies/${props.vacancy.id}/resume`);
    return;
  }

  await handleGenerate();
};

/**
 * Handle status change from StatusBadge dropdown (T032-T033)
 */
const handleStatusChange = async (newStatus: VacancyStatus) => {
  isUpdatingStatus.value = true;

  try {
    await vacancyStore.updateVacancy(props.vacancy.id, { status: newStatus });

    toast.add({
      title: t('vacancy.status.updateSuccess'),
      color: 'success'
    });
  } catch (err) {
    toast.add({
      title: t('vacancy.status.updateFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isUpdatingStatus.value = false;
  }
};
</script>
