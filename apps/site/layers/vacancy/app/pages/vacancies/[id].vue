<template>
  <div class="vacancy-detail-layout">
    <VacancyItemLayoutHeader
      :vacancy-id="vacancyId"
      :company="getCurrentVacancyMeta?.company ?? ''"
      :job-position="getCurrentVacancyMeta?.jobPosition"
    />

    <main class="vacancy-detail-layout__content">
      <NuxtPage />
    </main>
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
const vacancyStore = useVacancyStore();
const { getCurrentVacancyMeta } = storeToRefs(vacancyStore);

const vacancyId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

// Fetch vacancy meta at layout level for title and detail header
const { error: vacancyMetaError } = await useAsyncData(
  `vacancy-layout-meta-${vacancyId.value}`,
  () => vacancyStore.fetchVacancyMeta(vacancyId.value)
);

if (vacancyMetaError.value || !getCurrentVacancyMeta.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('vacancy.error.fetchDetailFailed')
  });
}

// Page meta
useHead({
  title: computed(() => {
    const meta = getCurrentVacancyMeta.value;
    const baseTitle = meta ? meta.company : t('vacancy.detail.title');
    return meta?.jobPosition ? `${baseTitle} – ${meta.jobPosition}` : baseTitle;
  })
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
