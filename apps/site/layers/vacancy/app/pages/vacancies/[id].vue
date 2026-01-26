<template>
  <div class="vacancy-detail-page container mx-auto max-w-4xl p-4 py-8">
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
    >
      <template #actions>
        <UButton variant="ghost" @click="goToList">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UAlert>

    <!-- Content -->
    <template v-else-if="vacancy">
      <!-- Header -->
      <div class="mb-8">
        <div class="mb-4">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="goToList">
            {{ $t('common.back') }}
          </UButton>
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold">
              {{ vacancyTitle }}
            </h1>
            <p class="mt-2 text-muted">{{ $t('vacancy.detail.updatedAt') }}: {{ formattedDate }}</p>
          </div>
          <div class="flex gap-2">
            <UButton variant="outline" icon="i-lucide-edit" @click="toggleEditMode">
              {{ isEditMode ? $t('common.cancel') : $t('vacancy.detail.actions.edit') }}
            </UButton>
            <UButton variant="outline" color="error" icon="i-lucide-trash-2" @click="confirmDelete">
              {{ $t('vacancy.detail.actions.delete') }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Edit Mode: Form -->
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
        <!-- Generation Section -->
        <UPageCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('vacancy.detail.actions.generate') }}
            </h2>
          </template>

          <!-- Loading state -->
          <div v-if="generationPending" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
          </div>

          <!-- Latest generation exists -->
          <div v-else-if="latestGeneration" class="space-y-6">
            <!-- Match Score Display -->
            <VacancyMatchScoreDisplay
              :score-before="latestGeneration.matchScoreBefore"
              :score-after="latestGeneration.matchScoreAfter"
            />

            <!-- Lifetime Indicator -->
            <VacancyLifetimeIndicator :generation="latestGeneration" />

            <!-- Actions -->
            <div class="flex flex-wrap gap-3">
              <VacancyGenerateButton :loading="isGenerating" @generate="handleGenerate" />
              <UButton variant="outline" icon="i-lucide-file-text" @click="viewAtsResume">
                {{ $t('vacancy.detail.actions.viewAts') }}
              </UButton>
              <UButton variant="outline" icon="i-lucide-layout-template" @click="viewHumanResume">
                {{ $t('vacancy.detail.actions.viewHuman') }}
              </UButton>
            </div>
            <VacancyExportButtons
              :vacancy-id="vacancyId"
              :generation-id="latestGeneration.id"
              :disabled="isGenerating"
            />
          </div>

          <!-- No generation yet -->
          <div v-else class="space-y-4">
            <p class="text-sm text-muted">
              {{ $t('vacancy.detail.generateHint') }}
            </p>
            <VacancyGenerateButton
              :loading="isGenerating"
              :disabled="!hasResume"
              @generate="handleGenerate"
            />
            <p v-if="!hasResume" class="text-xs text-error">
              {{ $t('generation.error.noResume') }}
            </p>
          </div>

          <!-- Generation Error -->
          <UAlert
            v-if="generationError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :title="$t('generation.error.generationFailed')"
            :description="generationError"
            class="mt-4"
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
    </template>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
            <h3 class="text-lg font-semibold">
              {{ $t('vacancy.delete.confirm') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('vacancy.delete.description') }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isDeleteModalOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="handleDelete">
              {{ isDeleting ? $t('vacancy.delete.deleting') : $t('vacancy.delete.button') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Detail Page
 *
 * Shows details of a specific vacancy with edit and delete actions.
 * Supports inline edit mode.
 *
 * Related: T103 (US4)
 */

import type { VacancyInput } from '@int/schema';
import { getVacancyTitle } from '@int/schema';

defineOptions({ name: 'VacancyDetailPage' });

// Auth is handled by global middleware

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t, d } = useI18n();

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

// Edit mode state
const isEditMode = ref(route.query.edit === 'true');

// Action states
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const isGenerating = ref(false);
const generationError = ref<string | null>(null);
const hasResume = ref(true); // TODO: Check if user has at least one resume

// Computed values
const vacancyTitle = computed(() => (vacancy.value ? getVacancyTitle(vacancy.value) : ''));

const formattedDate = computed(() => {
  if (!vacancy.value) return '';
  const date = new Date(vacancy.value.updatedAt);
  return d(date, 'long');
});

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
    router.push('/vacancies');
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
  router.push('/vacancies');
};

// Generation handlers
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

const viewAtsResume = () => {
  if (!latestGeneration.value) return;
  router.push(`/vacancies/${vacancyId.value}/ats`);
};

const viewHumanResume = () => {
  if (!latestGeneration.value) return;
  router.push(`/vacancies/${vacancyId.value}/human`);
};
</script>

<style lang="scss">
.vacancy-detail-page {
  // Page-specific styling if needed
}
</style>
