<template>
  <div class="vacancy-list-page container mx-auto max-w-5xl p-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('vacancy.list.title') }}
        </h1>
        <p v-if="totalItems > 0" class="mt-2 text-muted">
          {{ $t('vacancy.list.count', { count: totalItems }) }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" size="lg" to="/vacancies/new">
        {{ $t('vacancy.list.createButton') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

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

    <UPageCard v-else-if="totalItems === 0 && !hasActiveFilters" class="text-center">
      <!-- Empty State (no data at all) -->
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
          <UButton color="primary" icon="i-lucide-plus" size="lg" to="/vacancies/new">
            {{ $t('vacancy.list.createButton') }}
          </UButton>
        </div>
      </div>
    </UPageCard>

    <template v-else>
      <!-- Toolbar -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <!-- Search -->
        <UInput
          v-model="searchInput"
          :placeholder="$t('vacancy.list.search.placeholder')"
          icon="i-lucide-search"
          class="min-w-[200px] max-w-sm flex-1"
        />

        <!-- Status filter -->
        <USelectMenu
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          multiple
          :placeholder="$t('vacancy.list.filter.statusPlaceholder')"
          class="w-48"
        />

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Bulk action bar -->
        <template v-if="selectedCount > 0">
          <span class="text-sm font-medium">
            {{ $t('vacancy.list.bulkActions.selected', { count: selectedCount }) }}
          </span>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            size="sm"
            @click="confirmBulkDelete"
          >
            {{ $t('vacancy.list.bulkActions.deleteSelected') }}
          </UButton>
        </template>

        <!-- Column visibility dropdown -->
        <UDropdownMenu :items="columnVisibilityItems" :content="{ align: 'end' }">
          <UButton
            :label="$t('vacancy.list.columnVisibility.label')"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
            size="sm"
          />
        </UDropdownMenu>
      </div>

      <!-- Table -->
      <UTable
        v-model:sorting="sorting"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        :data="vacancies"
        :columns="columns"
        :loading="loading"
        :ui="{ root: 'w-full' }"
        :sorting-options="{ manualSorting: true }"
        :get-row-id="getRowId"
        @select="onRowSelect"
      />

      <!-- Pagination -->
      <div class="mt-6 flex items-center justify-between">
        <!-- Page size selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">{{ $t('vacancy.list.perPage') }}</span>
          <USelect v-model="pageSize" :items="pageSizeOptions" class="w-20" size="sm" />
        </div>

        <!-- Pagination buttons -->
        <UPagination
          v-if="totalPages > 1"
          v-model:page="currentPage"
          :items-per-page="pageSize"
          :total="totalItems"
          :sibling-count="1"
          show-edges
        />
      </div>
    </template>

    <!-- Delete Confirmation Modal (single) -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
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
      </template>
    </UModal>

    <!-- Bulk Delete Confirmation Modal -->
    <UModal v-model:open="isBulkDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              <h3 class="text-lg font-semibold">
                {{ $t('vacancy.list.bulkActions.confirmTitle', { count: selectedCount }) }}
              </h3>
            </div>
          </template>

          <p class="text-muted">
            {{ $t('vacancy.list.bulkActions.confirmDescription') }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" @click="isBulkDeleteModalOpen = false">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton color="error" :loading="isBulkDeleting" @click="handleBulkDelete">
                {{ $t('vacancy.list.bulkActions.deleteSelected') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancies List Page
 *
 * UTable with server-side pagination, sorting, filtering, search,
 * row selection + bulk delete, and column visibility persistence.
 */

import type { TableColumn, TableRow } from '#ui/types';
import type { Vacancy, VacancyListQuery, VacancyStatus } from '@int/schema';
import { VACANCY_STATUS_VALUES } from '@int/schema';
import { useDebounceFn } from '@vueuse/core';
import { format } from 'date-fns';
import { h, resolveComponent } from 'vue';
import { getStatusColor } from '../../utils/statusColors';

type SortingState = { id: string; desc: boolean }[];
type RowSelectionState = Record<string, boolean>;
type VisibilityState = Record<string, boolean>;

defineOptions({ name: 'VacancyListPage' });

const toast = useToast();
const { t } = useI18n();

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UCheckbox = resolveComponent('UCheckbox');

// =========================================
// Store & State
// =========================================

const vacancyStore = useVacancyStore();

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 25, 50, 100];

// Sorting state (TanStack format)
const sorting = ref<SortingState>([]);

// Status filter
const statusFilter = ref<VacancyStatus[]>([]);
const statusOptions = VACANCY_STATUS_VALUES.map(status => ({
  label: t(`vacancy.status.${status}`),
  value: status
}));

// Search
const searchInput = ref('');
const searchQuery = ref('');

const debouncedSearch = useDebounceFn((value: string) => {
  if (value.length >= 3 || value.length === 0) {
    searchQuery.value = value;
    currentPage.value = 1;
  }
}, 1000);

watch(searchInput, value => {
  debouncedSearch(value);
});

// Row selection
const rowSelection = ref<RowSelectionState>({});
const selectedCount = computed(() => Object.keys(rowSelection.value).length);
const selectedIds = computed(() => Object.keys(rowSelection.value));

// Column visibility
const columnVisibility = ref<VisibilityState>({});

// Track if filters/search are active for empty state distinction
const hasActiveFilters = computed(
  () => statusFilter.value.length > 0 || searchQuery.value.length >= 3
);

// Page size change resets to page 1
watch(pageSize, () => {
  currentPage.value = 1;
});

// =========================================
// Query Params & Data Fetching
// =========================================

// Map TanStack SortingState to API params
const sortParams = computed(() => {
  const sort = sorting.value[0];
  if (!sort) return {};
  return {
    sortBy: sort.id as 'updatedAt' | 'createdAt',
    sortOrder: sort.desc ? ('desc' as const) : ('asc' as const)
  };
});

const queryParams = computed(() => {
  const params: VacancyListQuery = {
    currentPage: currentPage.value,
    pageSize: pageSize.value,
    ...sortParams.value
  };
  if (statusFilter.value.length > 0) {
    params.status = statusFilter.value;
  }
  if (searchQuery.value.length >= 3) {
    params.search = searchQuery.value;
  }
  return params;
});

const { pending: loading, error } = await useAsyncData(
  'vacancies-list',
  () => vacancyStore.fetchVacanciesPaginated(queryParams.value),
  { watch: [queryParams] }
);

// Initialize column visibility from server response
watch(
  () => vacancyStore.vacancyListResponse?.columnVisibility,
  serverVisibility => {
    if (serverVisibility && Object.keys(columnVisibility.value).length === 0) {
      columnVisibility.value = { ...serverVisibility };
    }
  },
  { immediate: true }
);

const vacancies = computed(() => vacancyStore.vacancies);
const totalItems = computed(() => vacancyStore.vacancyListResponse?.pagination.totalItems ?? 0);
const totalPages = computed(() => vacancyStore.vacancyListResponse?.pagination.totalPages ?? 0);

// Reset page on filter/status change
watch(statusFilter, () => {
  currentPage.value = 1;
});

// =========================================
// Column Visibility Persistence
// =========================================

const toggleableColumns = ['company', 'status', 'updatedAt', 'createdAt'] as const;

const columnVisibilityItems = computed(() =>
  toggleableColumns.map(colId => ({
    label: t(`vacancy.list.columns.${colId}`),
    type: 'checkbox' as const,
    checked: columnVisibility.value[colId] !== false,
    onUpdateChecked(checked: boolean) {
      columnVisibility.value = { ...columnVisibility.value, [colId]: checked };
      vacancyStore.updateColumnVisibility(columnVisibility.value);
    },
    onSelect(e: Event) {
      e.preventDefault();
    }
  }))
);

// =========================================
// Single Delete Handling
// =========================================

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const vacancyToDelete = ref<Vacancy | null>(null);

const confirmDelete = (vacancy: Vacancy) => {
  vacancyToDelete.value = vacancy;
  isDeleteModalOpen.value = true;
};

// =========================================
// Table Columns
// =========================================

const getRowId = (row: Vacancy) => row.id;

const columns = [
  {
    id: 'select',
    header: ({
      table
    }: {
      table: {
        getIsSomePageRowsSelected: () => boolean;
        getIsAllPageRowsSelected: () => boolean;
        toggleAllPageRowsSelected: (value: boolean) => void;
      };
    }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
    cell: ({
      row
    }: {
      row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void };
    }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row',
        onClick: (e: Event) => e.stopPropagation()
      }),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'company',
    header: t('vacancy.list.columns.company'),
    enableSorting: false,
    cell: ({ row }: { row: { original: Vacancy } }) => {
      const company = row.original.company;
      const position = row.original.jobPosition;
      return h('div', { class: 'min-w-0' }, [
        h('div', { class: 'font-medium truncate' }, company),
        position
          ? h('div', { class: 'text-sm text-muted truncate' }, position)
          : h(
              'div',
              { class: 'text-sm text-muted/50 italic truncate' },
              t('vacancy.list.noPosition')
            )
      ]);
    }
  },
  {
    accessorKey: 'status',
    header: t('vacancy.list.columns.status'),
    enableSorting: false,
    cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
      const status = row.getValue('status') as VacancyStatus;
      return h(
        UBadge,
        { class: 'capitalize', variant: 'subtle', color: getStatusColor(status) },
        () => t(`vacancy.status.${status}`)
      );
    }
  },
  {
    accessorKey: 'updatedAt',
    header: t('vacancy.list.columns.updatedAt'),
    cell: ({ row }: { row: { getValue: (key: string) => unknown } }) =>
      format(new Date(row.getValue('updatedAt') as string), 'dd.MM.yyyy')
  },
  {
    accessorKey: 'createdAt',
    header: t('vacancy.list.columns.createdAt'),
    cell: ({ row }: { row: { getValue: (key: string) => unknown } }) =>
      format(new Date(row.getValue('createdAt') as string), 'dd.MM.yyyy')
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    enableSorting: false,
    meta: {
      class: {
        td: 'text-right'
      }
    },
    cell: ({ row }: { row: { original: Vacancy } }) => {
      return h(UButton, {
        icon: 'i-lucide-trash-2',
        color: 'error',
        variant: 'ghost',
        size: 'xs',
        'aria-label': t('vacancy.delete.button'),
        onClick: (e: Event) => {
          e.stopPropagation();
          confirmDelete(row.original);
        }
      });
    }
  }
] satisfies TableColumn<Vacancy>[];

// =========================================
// Row Click Navigation
// =========================================

const onRowSelect = (_event: Event, row: TableRow<Vacancy>) => {
  navigateTo(`/vacancies/${row.original.id}`);
};

const handleDelete = async () => {
  if (!vacancyToDelete.value) return;

  isDeleting.value = true;

  try {
    await vacancyStore.deleteVacancy(vacancyToDelete.value.id);

    toast.add({
      title: t('vacancy.delete.success'),
      color: 'success'
    });

    isDeleteModalOpen.value = false;
    vacancyToDelete.value = null;

    await vacancyStore.fetchVacanciesPaginated(queryParams.value);
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

// =========================================
// Bulk Delete Handling
// =========================================

const isBulkDeleteModalOpen = ref(false);
const isBulkDeleting = ref(false);

const confirmBulkDelete = () => {
  isBulkDeleteModalOpen.value = true;
};

const handleBulkDelete = async () => {
  if (selectedIds.value.length === 0) return;

  isBulkDeleting.value = true;

  try {
    await vacancyStore.bulkDeleteVacancies(selectedIds.value);

    toast.add({
      title: t('vacancy.list.bulkActions.success', { count: selectedIds.value.length }),
      color: 'success'
    });

    isBulkDeleteModalOpen.value = false;
    rowSelection.value = {};

    await vacancyStore.fetchVacanciesPaginated(queryParams.value);
  } catch (err) {
    toast.add({
      title: t('vacancy.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isBulkDeleting.value = false;
  }
};
</script>

<style lang="scss">
.vacancy-list-page {
  // Page-specific styling if needed
}
</style>
