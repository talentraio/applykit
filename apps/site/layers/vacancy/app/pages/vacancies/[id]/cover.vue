<template>
  <div class="vacancy-cover-page">
    <div class="vacancy-cover-page__content">
      <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
      <h2 class="mt-4 text-xl font-semibold">{{ t('vacancy.nav.coverLetter') }}</h2>
      <p class="mt-2 text-muted">{{ t('vacancy.comingSoon') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyCoverPage' });

const { t } = useI18n();
</script>

<style lang="scss">
.vacancy-cover-page {
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
