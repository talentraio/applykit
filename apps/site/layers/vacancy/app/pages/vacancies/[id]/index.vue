<template>
  <div />
</template>

<script setup lang="ts">
/**
 * Vacancy Detail Index Redirect
 *
 * Redirects /vacancies/:id to /vacancies/:id/overview.
 * The actual detail content is in overview.vue (Phase 4).
 *
 * Related: T018 (US1)
 */

defineOptions({ name: 'VacancyDetailIndexRedirect' });

const route = useRoute();

const vacancyId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

// Redirect to overview
await navigateTo(`/vacancies/${vacancyId.value}/overview`, { replace: true });
</script>
