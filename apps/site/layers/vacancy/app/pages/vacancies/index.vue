<template>
  <div
    class="vacancy-list-page flex flex-col p-4 py-6 md:h-[calc(100dvh-169px)] md:min-h-[calc(100dvh-169px)] md:max-h-[calc(100dvh-169px)] md:overflow-hidden"
  >
    <!-- Header -->
    <div
      class="mb-6 flex min-h-[68px] shrink-0 items-center justify-between rounded-lg bg-default/95 py-1 backdrop-blur md:min-h-0 md:rounded-none md:bg-transparent md:py-0"
    >
      <div class="flex flex-col md:flex-row md:items-center md:gap-3">
        <h1 class="text-3xl font-bold">
          {{ $t('vacancy.list.title') }}
        </h1>

        <p v-if="vacancyStore.totalItems > 0" class="mt-2 text-muted md:mt-0 md:translate-y-0.5">
          {{ vacancyCountLabel }}
        </p>
      </div>

      <UButton
        color="primary"
        size="lg"
        square
        class="h-[56px] w-[56px] !justify-center !p-0 md:hidden"
        :aria-label="$t('vacancy.list.createButton')"
        to="/vacancies/new"
      >
        <UIcon name="i-lucide-plus" class="size-8" />
      </UButton>
    </div>

    <div class="md:min-h-0 md:flex-1">
      <!-- Loading State -->
      <BasePageLoading v-if="pageLoading" />

      <template v-else-if="error">
        <!-- Error State -->
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="$t('vacancy.error.fetchFailed')"
          :description="error.message"
        />
      </template>

      <VacancyListEmptyState v-else-if="vacancyStore.totalItems === 0 && !hasActiveFilters" />

      <template v-else>
        <VacancyListContent
          ref="listContentRef"
          v-model:query-params="queryParamsModel"
          class="md:h-full md:min-h-0"
          :run-query="runQuery"
          @bulk-delete="confirmBulkDelete"
          @delete-vacancy="confirmDelete"
        />
      </template>
    </div>

    <!-- Delete Confirmation Modal (single) -->
    <VacancyModalDeleteConfirmation
      v-model:open="isDeleteModalOpen"
      :vacancy-id="vacancyToDelete?.id ?? null"
      @success="handleDeleteSuccess"
    />

    <!-- Bulk Delete Confirmation Modal -->
    <VacancyModalBulkDeleteConfirmation
      v-model:open="isBulkDeleteModalOpen"
      :vacancy-ids="selectedIdsToDelete"
      @success="handleDeleteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancies List Page
 *
 * UTable with server-side pagination, sorting, filtering, search,
 * row selection + bulk delete, and column visibility persistence.
 */

import type { Vacancy, VacancyListQuery } from '@int/schema';

type VacancyListContentExposed = {
  resetSelection: () => void;
  syncVisibleItems: () => void;
};

defineOptions({ name: 'VacancyListPage' });

const toast = useToast();
const { t } = useI18n();

// =========================================
// Store & State
// =========================================

const vacancyStore = useVacancyStore();

const queryParams = ref<VacancyListQuery>({
  currentPage: 1,
  pageSize: 25
});
const vacancyCountLabel = computed(() =>
  t('vacancy.list.count', { count: vacancyStore.totalItems }, vacancyStore.totalItems)
);

// Track if filters/search are active for empty state distinction
const hasActiveFilters = computed(
  () => (queryParams.value.status?.length ?? 0) > 0 || (queryParams.value.search?.length ?? 0) >= 3
);

// =========================================
// Query Params & Data Fetching
// =========================================

const { data, pending, error, refresh } = await useAsyncData('vacancies-list', () =>
  vacancyStore.fetchVacanciesPaginated(queryParams.value)
);
const pageLoading = computed(() => !data.value && pending.value);

const queryParamsModel = computed({
  get: () => queryParams.value,
  set: value => {
    queryParams.value = value;
  }
});

const runQuery = async (nextQuery: VacancyListQuery) => {
  queryParams.value = nextQuery;
  await refresh();
};

// =========================================
// Delete Modals Handling
// =========================================

const listContentRef = ref<VacancyListContentExposed | null>(null);
const isDeleteModalOpen = ref(false);
const isBulkDeleteModalOpen = ref(false);
const vacancyToDelete = ref<Vacancy | null>(null);
const selectedIdsToDelete = ref<string[]>([]);

const confirmDelete = (vacancy: Vacancy) => {
  vacancyToDelete.value = vacancy;
  isDeleteModalOpen.value = true;
};

const confirmBulkDelete = (ids: string[]) => {
  selectedIdsToDelete.value = ids;
  isBulkDeleteModalOpen.value = true;
};

const handleDeleteSuccess = async () => {
  vacancyToDelete.value = null;
  selectedIdsToDelete.value = [];
  listContentRef.value?.resetSelection();

  try {
    await runQuery(queryParams.value);
    listContentRef.value?.syncVisibleItems();
  } catch (err) {
    toast.add({
      title: t('vacancy.error.fetchFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  }
};
</script>
