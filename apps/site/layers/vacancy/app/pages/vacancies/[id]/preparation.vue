<template>
  <div class="vacancy-preparation-page">
    <div class="vacancy-preparation-page__content">
      <UIcon name="i-lucide-sparkles" class="h-12 w-12 text-muted" />
      <h2 class="mt-4 text-xl font-semibold">{{ t('vacancy.nav.preparation') }}</h2>
      <p class="mt-2 text-muted">{{ t('vacancy.comingSoon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyPreparationPage' });

const { t } = useI18n();
</script>

<style lang="scss">
.vacancy-preparation-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  text-align: center;

  &__content {
    max-width: 420px;
  }
}
</style>
