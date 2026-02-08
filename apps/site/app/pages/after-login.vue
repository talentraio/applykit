<template>
  <div class="after-login-page flex min-h-screen items-center justify-center">
    <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
  </div>
</template>

<script setup lang="ts">
/**
 * After Login Redirect Page
 *
 * Redirects users based on vacancy presence:
 * - If user has vacancies: /vacancies
 * - Otherwise: /resume
 */

defineOptions({ name: 'AfterLoginPage' });

definePageMeta({
  layout: false
});

const vacancyStore = useVacancyStore();

try {
  const response = await vacancyStore.fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 });
  await navigateTo(response.pagination.totalItems > 0 ? '/vacancies' : '/resume', {
    replace: true
  });
} catch {
  await navigateTo('/resume', { replace: true });
}
</script>

<style lang="scss">
.after-login-page {
  min-height: 100vh;
}
</style>
