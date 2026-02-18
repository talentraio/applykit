<template>
  <div class="vacancy-overview p-4 py-6">
    <BasePageLoading v-if="vacancyPending" wrapper-class="py-8" />

    <template v-else-if="vacancy">
      <!-- Overview Content -->
      <template v-if="isEditMode">
        <!-- Edit Mode: Show VacancyItemOverviewForm -->
        <UPageCard>
          <template #header>
            <h2 class="text-lg font-semibold">{{ t('vacancy.form.editTitle') }}</h2>
          </template>

          <VacancyItemOverviewForm
            :vacancy="vacancy"
            :saving="isSaving"
            show-cancel
            @save="handleSave"
            @cancel="handleCancel"
          />
        </UPageCard>
      </template>

      <template v-else>
        <!-- View Mode: Show Overview Layout -->
        <VacancyItemOverviewContent @edit="handleToggleEdit" @delete="handleDeleteClick" />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Overview Page
 *
 * Main overview page for a vacancy showing:
 * - Title row with company name, position, edit/delete buttons
 * - Meta row with Last Updated, Vacancy page link, status badge
 * - Actions row with Generate buttons
 * - Conditional Match Score block (if generation exists)
 * - Conditional Expires block (generation expiry)
 * - Description and Notes blocks
 * - Inline edit mode with VacancyItemOverviewForm toggle
 *
 * Related: T020-T027 (US2)
 */

import type { VacancyInput } from '@int/schema';

defineOptions({ name: 'VacancyOverviewPage' });

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { openDeleteConfirmationModal } = useVacancyModals();

// Store
const vacancyStore = useVacancyStore();

// --- State ---
const isEditMode = ref(false);
const isSaving = ref(false);

const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const { pending: vacancyPending, error: vacancyFetchError } = await useAsyncData(
  'vacancy-overview',
  () => {
    return vacancyStore.fetchVacancyOverview(vacancyId.value);
  },
  {
    watch: [vacancyId]
  }
);

watch(
  vacancyFetchError,
  error => {
    if (!error) return;

    showError(
      createError({
        statusCode: 404,
        statusMessage: t('vacancy.error.fetchDetailFailed')
      })
    );
  },
  { immediate: true }
);

const vacancy = computed(() => vacancyStore.currentVacancy);

// --- Event Handlers ---

/**
 * Toggle inline edit mode
 */
const handleToggleEdit = () => {
  isEditMode.value = !isEditMode.value;
};

/**
 * Handle vacancy form save
 */
const handleSave = async (data: VacancyInput) => {
  isSaving.value = true;

  try {
    await vacancyStore.updateVacancy(vacancyId.value, data);
    isEditMode.value = false;

    toast.add({
      title: t('vacancy.form.success'),
      color: 'success'
    });
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

/**
 * Handle vacancy form cancel
 */
const handleCancel = () => {
  isEditMode.value = false;
};

/**
 * Open delete confirmation modal
 */
const handleDeleteClick = async () => {
  const result = await openDeleteConfirmationModal(vacancyId.value);
  if (result?.action === 'deleted') {
    await navigateTo('/vacancies');
  }
};
</script>
