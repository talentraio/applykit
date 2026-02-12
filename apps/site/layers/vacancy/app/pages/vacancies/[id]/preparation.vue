<template>
  <div class="vacancy-preparation-page p-4 py-6">
    <BasePageLoading v-if="pending" wrapper-class="py-8" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="t('common.error.generic')"
      :description="errorMessage"
    />

    <template v-else-if="!preparation?.latestGeneration">
      <UPageCard class="vacancy-preparation-page__empty-card">
        <div class="space-y-4 text-center">
          <UIcon name="i-lucide-file-text" class="mx-auto h-10 w-10 text-muted" />
          <h2 class="text-lg font-semibold">{{ t('vacancy.preparation.noGenerationTitle') }}</h2>
          <p class="text-sm text-muted">{{ t('vacancy.preparation.noGenerationDescription') }}</p>
          <UButton :to="`/vacancies/${vacancyId}/overview`" icon="i-lucide-arrow-left">
            {{ t('vacancy.resume.backToOverview') }}
          </UButton>
        </div>
      </UPageCard>
    </template>

    <template v-else-if="!preparation?.scoreDetails">
      <UPageCard class="vacancy-preparation-page__empty-card">
        <div class="space-y-4 text-center">
          <UIcon name="i-lucide-list-checks" class="mx-auto h-10 w-10 text-muted" />
          <h2 class="text-lg font-semibold">{{ t('vacancy.preparation.noDetailsTitle') }}</h2>
          <p class="text-sm text-muted">{{ t('vacancy.preparation.noDetailsDescription') }}</p>
          <UButton :to="`/vacancies/${vacancyId}/resume`" icon="i-lucide-file-pen-line">
            {{ t('vacancy.preparation.openResume') }}
          </UButton>
        </div>
      </UPageCard>
    </template>

    <template v-else>
      <div class="space-y-6">
        <UPageCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-semibold">
                {{ t('vacancy.preparation.title') }}
              </h2>

              <UBadge v-if="preparation.scoreDetailsStale" color="warning" variant="soft">
                {{ t('vacancy.preparation.staleBadge') }}
              </UBadge>
            </div>
          </template>

          <div class="grid gap-3 sm:grid-cols-3">
            <UPageCard variant="subtle">
              <p class="text-xs text-muted">{{ t('vacancy.preparation.before') }}</p>
              <p class="text-xl font-semibold">
                {{ preparation.scoreDetails.details.summary.before }}%
              </p>
            </UPageCard>

            <UPageCard variant="subtle">
              <p class="text-xs text-muted">{{ t('vacancy.preparation.after') }}</p>
              <p class="text-xl font-semibold">
                {{ preparation.scoreDetails.details.summary.after }}%
              </p>
            </UPageCard>

            <UPageCard variant="subtle">
              <p class="text-xs text-muted">{{ t('vacancy.preparation.improvement') }}</p>
              <p class="text-xl font-semibold text-primary">
                +{{ preparation.scoreDetails.details.summary.improvement }}%
              </p>
            </UPageCard>
          </div>
        </UPageCard>

        <div class="grid gap-6 lg:grid-cols-2">
          <UPageCard>
            <template #header>
              <h3 class="text-base font-semibold">{{ t('vacancy.preparation.matched') }}</h3>
            </template>

            <ul class="space-y-2 text-sm">
              <li
                v-for="item in preparation.scoreDetails.details.matched"
                :key="`matched-${item.signalType}-${item.signal}`"
              >
                <span class="font-medium">{{ item.signal }}</span>
                <span class="text-muted"> · {{ percentage(item.weight) }}</span>
              </li>
            </ul>
          </UPageCard>

          <UPageCard>
            <template #header>
              <h3 class="text-base font-semibold">{{ t('vacancy.preparation.gaps') }}</h3>
            </template>

            <ul class="space-y-2 text-sm">
              <li
                v-for="item in preparation.scoreDetails.details.gaps"
                :key="`gaps-${item.signalType}-${item.signal}`"
              >
                <span class="font-medium">{{ item.signal }}</span>
                <span class="text-muted"> · {{ percentage(item.weight) }}</span>
              </li>
            </ul>
          </UPageCard>
        </div>

        <UPageCard>
          <template #header>
            <h3 class="text-base font-semibold">{{ t('vacancy.preparation.recommendations') }}</h3>
          </template>

          <ul class="list-disc space-y-2 pl-5 text-sm">
            <li
              v-for="(recommendation, index) in preparation.scoreDetails.details.recommendations"
              :key="`recommendation-${index}`"
            >
              {{ recommendation }}
            </li>
          </ul>
        </UPageCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { VacancyPreparationResponse } from '@layer/api/types/vacancies';

defineOptions({ name: 'VacancyPreparationPage' });

const route = useRoute();
const { t } = useI18n();
const vacancyStore = useVacancyStore();

const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const { data, pending, error } = await useAsyncData<VacancyPreparationResponse>(
  'vacancy-preparation',
  () => vacancyStore.fetchVacancyPreparation(vacancyId.value),
  {
    watch: [vacancyId]
  }
);

const preparation = computed(() => data.value ?? null);

const errorMessage = computed(() => {
  if (!error.value) {
    return '';
  }

  return error.value instanceof Error ? error.value.message : t('common.error.generic');
});

const percentage = (value: number): string => `${Math.round(value * 100)}%`;
</script>

<style lang="scss">
.vacancy-preparation-page {
  &__empty-card {
    max-width: 520px;
    margin: 0 auto;
  }
}
</style>
