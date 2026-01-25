<template>
  <div class="vacancy-detail-page container mx-auto max-w-4xl p-4 py-8">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('vacancy.error.fetchDetailFailed')"
      :description="error.message"
    >
      <template #actions>
        <UButton variant="ghost" @click="goToList">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UAlert>

    <!-- Content -->
    <template v-else-if="vacancy">
      <!-- Header -->
      <div class="mb-8">
        <div class="mb-4">
          <UButton variant="ghost" icon="i-lucide-arrow-left" @click="goToList">
            {{ $t('common.back') }}
          </UButton>
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold">
              {{ vacancyTitle }}
            </h1>
            <p class="mt-2 text-muted">{{ $t('vacancy.detail.updatedAt') }}: {{ formattedDate }}</p>
          </div>
          <div class="flex gap-2">
            <UButton variant="outline" icon="i-lucide-edit" @click="toggleEditMode">
              {{ isEditMode ? $t('common.cancel') : $t('vacancy.detail.actions.edit') }}
            </UButton>
            <UButton variant="outline" color="error" icon="i-lucide-trash-2" @click="confirmDelete">
              {{ $t('vacancy.detail.actions.delete') }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Edit Mode: Form -->
      <UPageCard v-if="isEditMode">
        <VacancyForm
          :vacancy="vacancy"
          :saving="isSaving"
          show-cancel
          @save="handleUpdate"
          @cancel="toggleEditMode"
        />
      </UPageCard>

      <!-- View Mode: Details -->
      <div v-else class="space-y-6">
        <!-- Company & Position -->
        <UPageCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('vacancy.detail.company') }}
            </h2>
          </template>
          <div class="space-y-2">
            <p class="text-lg font-medium">{{ vacancy.company }}</p>
            <p v-if="vacancy.jobPosition" class="text-muted">
              {{ vacancy.jobPosition }}
            </p>
            <p v-else class="text-sm text-muted">
              {{ $t('vacancy.detail.noPosition') }}
            </p>
          </div>
        </UPageCard>

        <!-- Description -->
        <UPageCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('vacancy.detail.description') }}
            </h2>
          </template>
          <div class="whitespace-pre-wrap text-sm">
            {{ vacancy.description }}
          </div>
        </UPageCard>

        <!-- URL -->
        <UPageCard v-if="vacancy.url">
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('vacancy.detail.url') }}
            </h2>
          </template>
          <ULink :to="vacancy.url" target="_blank" class="flex items-center gap-2 text-primary">
            <UIcon name="i-lucide-external-link" class="h-4 w-4" />
            {{ vacancy.url }}
          </ULink>
        </UPageCard>

        <!-- Notes -->
        <UPageCard v-if="vacancy.notes">
          <template #header>
            <h2 class="text-lg font-semibold">
              {{ $t('vacancy.detail.notes') }}
            </h2>
          </template>
          <div class="whitespace-pre-wrap text-sm text-muted">
            {{ vacancy.notes }}
          </div>
        </UPageCard>
      </div>
    </template>

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
 * Vacancy Detail Page
 *
 * Shows details of a specific vacancy with edit and delete actions.
 * Supports inline edit mode.
 *
 * Related: T103 (US4)
 */

import type { VacancyInput } from '@int/schema';
import { getVacancyTitle } from '@int/schema';

defineOptions({ name: 'VacancyDetailPage' });

// Auth is handled by global middleware

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t, d } = useI18n();

// Get vacancy ID from route
const vacancyId = computed(() => route.params.id as string);

// Use vacancy store via composable
const { current: vacancy, fetchVacancy, updateVacancy, deleteVacancy } = useVacancies();

// Fetch vacancy (SSR-compatible)
const { pending, error } = await useAsyncData(`vacancy-${vacancyId.value}`, () =>
  fetchVacancy(vacancyId.value)
);

// Edit mode state
const isEditMode = ref(route.query.edit === 'true');

// Action states
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);

// Computed values
const vacancyTitle = computed(() => (vacancy.value ? getVacancyTitle(vacancy.value) : ''));

const formattedDate = computed(() => {
  if (!vacancy.value) return '';
  const date = new Date(vacancy.value.updatedAt);
  return d(date, 'long');
});

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
  // Update URL query without navigation
  if (isEditMode.value) {
    router.replace({ query: { edit: 'true' } });
  } else {
    router.replace({ query: {} });
  }
};

const handleUpdate = async (data: VacancyInput) => {
  if (!vacancy.value) return;

  isSaving.value = true;

  try {
    await updateVacancy(vacancy.value.id, data);

    toast.add({
      title: `${t('common.update')} ${t('common.success').toLowerCase()}`,
      color: 'success'
    });

    isEditMode.value = false;
    router.replace({ query: {} });
  } catch (err) {
    toast.add({
      title: t('vacancy.error.updateFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = () => {
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!vacancy.value) return;

  isDeleting.value = true;

  try {
    await deleteVacancy(vacancy.value.id);

    toast.add({
      title: t('vacancy.delete.success'),
      color: 'success'
    });

    // Navigate back to list
    router.push('/vacancies');
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
    isDeleteModalOpen.value = false;
  } finally {
    isDeleting.value = false;
  }
};

const goToList = () => {
  router.push('/vacancies');
};
</script>

<style lang="scss">
.vacancy-detail-page {
  // Page-specific styling if needed
}
</style>
