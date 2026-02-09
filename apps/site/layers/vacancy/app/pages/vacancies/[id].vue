<template>
  <div class="vacancy-detail-layout">
    <!-- Loading State -->
    <BasePageLoading v-if="pending" />

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="t('vacancy.error.fetchDetailFailed')"
      :description="error.message"
      class="m-4"
    >
      <template #actions>
        <UButton variant="ghost" to="/vacancies">{{ t('common.back') }}</UButton>
      </template>
    </UAlert>

    <!-- Content -->
    <template v-else-if="vacancy">
      <VacancyDetailHeader
        :vacancy-id="vacancyId"
        :company="vacancy.company"
        :job-position="vacancy.jobPosition"
      />

      <main class="vacancy-detail-layout__content">
        <NuxtPage :vacancy="vacancy" />
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Detail Layout Wrapper
 *
 * Parent route for all vacancy sub-pages (/vacancies/:id/*).
 * Fetches vacancy data and renders the thin header + child routes.
 *
 * Child routes:
 * - /vacancies/:id/overview - Overview page (US2)
 * - /vacancies/:id/resume - Resume editing (US4)
 * - /vacancies/:id/cover - Cover letter (US5, placeholder)
 * - /vacancies/:id/preparation - Interview prep (US5, placeholder)
 *
 * Related: T017 (US1)
 */

defineOptions({ name: 'VacancyDetailLayout' });

const route = useRoute();
const { t } = useI18n();

const vacancyId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

// Fetch vacancy data at layout level so all child pages have access
const vacancyStore = useVacancyStore();
const vacancy = computed(() => vacancyStore.currentVacancy);

const { pending, error } = await useAsyncData(`vacancy-layout-${vacancyId.value}`, () => {
  return vacancyStore.fetchVacancy(vacancyId.value);
});

// Page meta
useHead({
  title: computed(() =>
    vacancy.value
      ? `${vacancy.value.company}${vacancy.value.jobPosition ? ` – ${vacancy.value.jobPosition}` : ''}`
      : t('vacancy.detail.title')
  )
});
</script>

<style lang="scss">
.vacancy-detail-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--layout-header-height, 64px));
  min-height: 0;

  &__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
}
</style>
