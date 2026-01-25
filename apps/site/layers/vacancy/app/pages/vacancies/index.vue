<template>
  <div class="vacancy-list-page container mx-auto max-w-6xl p-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('vacancy.list.title') }}
        </h1>
        <p v-if="vacancies.length > 0" class="mt-2 text-muted">
          {{ $t('vacancy.list.count', { count: vacancies.length }) }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" size="lg" @click="goToCreate">
        {{ $t('vacancy.list.createButton') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('vacancy.error.fetchFailed')"
      :description="error.message"
    />

    <!-- Empty State -->
    <UPageCard v-else-if="vacancies.length === 0" class="text-center">
      <div class="py-12">
        <div class="flex justify-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <UIcon name="i-lucide-briefcase" class="h-10 w-10 text-muted" />
          </div>
        </div>
        <h3 class="mt-6 text-xl font-semibold">
          {{ $t('vacancy.list.empty') }}
        </h3>
        <p class="mt-2 text-muted">
          {{ $t('vacancy.list.emptyDescription') }}
        </p>
        <div class="mt-6">
          <UButton color="primary" icon="i-lucide-plus" size="lg" @click="goToCreate">
            {{ $t('vacancy.list.createButton') }}
          </UButton>
        </div>
      </div>
    </UPageCard>

    <!-- Vacancies Grid -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <VacancyCard
        v-for="vacancy in vacancies"
        :key="vacancy.id"
        :vacancy="vacancy"
        @click="viewVacancy(vacancy.id)"
        @edit="editVacancy(vacancy.id)"
        @delete="confirmDelete(vacancy)"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
            <h3 class="text-lg font-semibold">
              {{ $t('vacancy.delete.confirm') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('vacancy.delete.description') }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="isDeleteModalOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="handleDelete">
              {{ isDeleting ? $t('vacancy.delete.deleting') : $t('vacancy.delete.button') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancies List Page
 *
 * Displays all vacancies for the current user.
 * Provides create, view, edit, and delete actions.
 *
 * Related: T101 (US4)
 */

import type { Vacancy } from '@int/schema';

defineOptions({ name: 'VacancyListPage' });

// Auth is handled by global middleware

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// Use vacancy store via composable
const { vacancies, loading, error, fetchVacancies, deleteVacancy } = useVacancies();

// Fetch vacancies on page load (SSR-compatible)
await callOnce(async () => {
  await fetchVacancies();
});

// Delete modal state
const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const vacancyToDelete = ref<Vacancy | null>(null);

const goToCreate = () => {
  router.push('/vacancies/new');
};

const viewVacancy = (id: string) => {
  router.push(`/vacancies/${id}`);
};

const editVacancy = (id: string) => {
  router.push(`/vacancies/${id}?edit=true`);
};

const confirmDelete = (vacancy: Vacancy) => {
  vacancyToDelete.value = vacancy;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!vacancyToDelete.value) return;

  isDeleting.value = true;

  try {
    await deleteVacancy(vacancyToDelete.value.id);

    toast.add({
      title: t('vacancy.delete.success'),
      color: 'success'
    });

    isDeleteModalOpen.value = false;
    vacancyToDelete.value = null;
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style lang="scss">
.vacancy-list-page {
  // Page-specific styling if needed
}
</style>
