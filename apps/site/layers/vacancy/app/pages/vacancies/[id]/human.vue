<template>
  <div class="vacancy-human-page container mx-auto max-w-5xl p-4 py-8">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <UButton variant="ghost" icon="i-lucide-arrow-left" :to="`/vacancies/${vacancyId}`">
          {{ $t('common.back') }}
        </UButton>
        <div>
          <h1 class="text-2xl font-semibold">
            {{ $t('resume.view.humanTitle') }}
          </h1>
          <p v-if="vacancyTitle" class="text-sm text-muted">
            {{ vacancyTitle }}
          </p>
        </div>
      </div>

      <div v-if="generation" class="flex flex-wrap items-center gap-3">
        <UButton variant="outline" icon="i-lucide-file-text" :to="`/vacancies/${vacancyId}/ats`">
          {{ $t('vacancy.detail.actions.viewAts') }}
        </UButton>
        <VacancyExportButtons :vacancy-id="vacancyId" :generation-id="generation.id" />
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="pageError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('vacancy.error.fetchDetailFailed')"
      :description="pageError"
    />

    <UAlert
      v-else-if="!generation"
      color="warning"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('export.error.noGeneration')"
    />

    <ResumePreview v-else :content="generation.content" type="human" :photo-url="profilePhotoUrl" />
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Human View Page
 *
 * Server-rendered human resume view for a vacancy.
 * Uses shared ResumePreview component from resume layer.
 *
 * Related: T027 (US2)
 */

import { getVacancyTitle } from '@int/schema';

defineOptions({ name: 'VacancyHumanViewPage' });

const route = useRoute();
const vacancyId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

const { current: vacancy, fetchVacancy } = useVacancies();
const { getLatestGeneration } = useGenerations();
const { profile } = useProfile();

// Get profile photo URL for human resume view
const profilePhotoUrl = computed(() => profile.value?.photoUrl);

const { pending: vacancyPending, error: vacancyError } = await useAsyncData(
  `vacancy-${vacancyId.value}`,
  () => fetchVacancy(vacancyId.value)
);

const {
  data: generation,
  pending: generationPending,
  error: generationError
} = await useAsyncData(`generation-${vacancyId.value}`, () => getLatestGeneration(vacancyId.value));

const isLoading = computed(() => vacancyPending.value || generationPending.value);

const pageError = computed(() => {
  const error = vacancyError.value || generationError.value;
  return error instanceof Error ? error.message : null;
});

const vacancyTitle = computed(() => (vacancy.value ? getVacancyTitle(vacancy.value) : ''));
</script>

<style lang="scss">
.vacancy-human-page {
  // Page-specific styling if needed
}
</style>
