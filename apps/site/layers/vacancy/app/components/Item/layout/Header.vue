<template>
  <header class="vacancy-detail-header">
    <div class="vacancy-detail-header__breadcrumbs">
      <VacancyItemLayoutBreadcrumbs
        :vacancy-id="vacancyId"
        :company="company"
        :job-position="jobPosition"
      />
    </div>

    <div class="vacancy-detail-header__nav">
      <VacancyItemLayoutNavDropdown :vacancy-id="vacancyId" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * VacancyItemLayoutHeader
 *
 * Thin header for vacancy detail sub-pages.
 * Contains breadcrumbs (left) and nav dropdown (right).
 *
 * Related: T016 (US1)
 */

defineOptions({ name: 'VacancyItemLayoutHeader' });

defineProps<{
  vacancyId: string;
  company: string;
  jobPosition?: string | null;
}>();
</script>

<style lang="scss">
.vacancy-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg);
  min-height: 3.5rem;

  &__breadcrumbs {
    min-width: 0;
  }

  &__nav {
    flex-shrink: 0;
  }

  @media (width <= 640px) {
    flex-wrap: wrap;
    align-items: flex-start;

    &__nav {
      width: 100%;
    }
  }
}
</style>
