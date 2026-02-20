<template>
  <div class="vacancy-new-page p-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="mb-4">
        <UButton variant="ghost" icon="i-lucide-arrow-left" @click="goBack">
          {{ $t('common.back') }}
        </UButton>
      </div>
      <h1 class="text-3xl font-bold">
        {{ $t('vacancy.form.createTitle') }}
      </h1>
    </div>

    <!-- Form Card -->
    <UPageCard>
      <VacancyItemOverviewForm :saving="isSaving" show-cancel @save="handleSave" @cancel="goBack" />
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * New Vacancy Page
 *
 * Form for creating a new job vacancy.
 *
 * Related: T102 (US4)
 */

import type { VacancyInput } from '@int/schema';

defineOptions({ name: 'VacancyNewPage' });

// Auth is handled by global middleware

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Use vacancy store
const vacancyStore = useVacancyStore();

const isSaving = ref(false);

const handleSave = async (data: VacancyInput) => {
  isSaving.value = true;

  try {
    const vacancy = await vacancyStore.createVacancy(data);

    toast.add({
      title: t('vacancy.form.success'),
      color: 'success'
    });

    // Navigate to vacancy detail page
    await navigateTo(`/vacancies/${vacancy.id}`);
  } catch (err) {
    toast.add({
      title: t('vacancy.error.createFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isSaving.value = false;
  }
};

const goBack = () => {
  router.back();
};
</script>

<style lang="scss">
.vacancy-new-page {
  // Page-specific styling if needed
}
</style>
