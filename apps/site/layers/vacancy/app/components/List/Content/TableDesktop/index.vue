<template>
  <div class="vacancy-list-content-table-desktop flex min-h-0 flex-1 flex-col">
    <!-- Table -->
    <UTable
      v-model:sorting="sortingModel"
      v-model:column-visibility="columnVisibilityModel"
      v-model:row-selection="rowSelectionModel"
      :data="vacancies"
      :columns="columns"
      :ui="{ root: 'min-h-0 h-full w-full' }"
      :sorting-options="{ manualSorting: true }"
      :get-row-id="getRowId"
      sticky="header"
      class="min-h-0 flex-1"
      @select="onRowSelect"
    />

    <!-- Pagination -->
    <div class="mt-4 flex shrink-0 items-center justify-between">
      <!-- Page size selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted">{{ $t('vacancy.list.perPage') }}</span>
        <USelect v-model="pageSizeModel" :items="pageSizeOptions" class="w-20" size="sm" />
      </div>

      <!-- Pagination buttons -->
      <UPagination
        v-if="totalPages > 1"
        v-model:page="currentPageModel"
        :items-per-page="pageSizeModel"
        :total="totalItems"
        :sibling-count="1"
        show-edges
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TableRow } from '#ui/types';
import type { Vacancy, VacancyListColumnVisibility, VacancyListQuery } from '@int/schema';
import { format } from 'date-fns';
import { h, resolveComponent } from 'vue';
import { getStatusColor } from '../../../../utils/statusColors';

type SortingState = { id: string; desc: boolean }[];
type RowSelectionState = Record<string, boolean>;
type VisibilityState = VacancyListColumnVisibility;
type SortableColumnId = NonNullable<VacancyListQuery['sortBy']>;
type SortDirection = false | 'asc' | 'desc';
type SortableHeaderContext = {
  column: {
    getIsSorted: () => SortDirection;
    toggleSorting: (desc?: boolean) => void;
    clearSorting: () => void;
  };
};
type Emits = {
  deleteVacancy: [vacancy: Vacancy];
};

defineOptions({ name: 'VacancyListContentTableDesktop' });

const emit = defineEmits<Emits>();
const queryParamsModel = defineModel<VacancyListQuery>('queryParams', { required: true });
const rowSelectionModel = defineModel<RowSelectionState>('rowSelection', { required: true });
const columnVisibilityModel = defineModel<VisibilityState>('columnVisibility', { required: true });
const { t } = useI18n();
const vacancyStore = useVacancyStore();

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UCheckbox = resolveComponent('UCheckbox');
const UDropdownMenu = resolveComponent('UDropdownMenu');

const pageSizeOptions = [25, 50, 100];
const NON_NAVIGABLE_CELL_CLASS = 'vacancy-list-content-table-desktop__cell--non-navigable';
const toggleableColumns = ['status', 'updatedAt', 'createdAt'] as const;

const isSortableColumnId = (value: string): value is SortableColumnId =>
  value === 'updatedAt' || value === 'createdAt';
const getSortIcon = (value: SortDirection) => {
  if (value === 'asc') {
    return 'i-lucide-arrow-up';
  }

  if (value === 'desc') {
    return 'i-lucide-arrow-down';
  }

  return 'i-lucide-arrow-up-down';
};
const createSortableHeader =
  (label: string) =>
  ({ column }: SortableHeaderContext) =>
    h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      size: 'xs',
      label,
      icon: getSortIcon(column.getIsSorted()),
      class: '-ml-2',
      onClick: () => {
        const currentSort = column.getIsSorted();

        if (currentSort === false) {
          column.toggleSorting(false);
          return;
        }

        if (currentSort === 'asc') {
          column.toggleSorting(true);
          return;
        }

        column.clearSorting();
      }
    });

const updateQueryParams = (partial: Partial<VacancyListQuery>) => {
  queryParamsModel.value = {
    ...queryParamsModel.value,
    ...partial
  };
};

const ensureCompanyColumnVisible = async () => {
  if (columnVisibilityModel.value.company === false) {
    columnVisibilityModel.value = { ...columnVisibilityModel.value, company: true };
    await vacancyStore.updateColumnVisibility(columnVisibilityModel.value);
  }
};
void ensureCompanyColumnVisible();

const columnVisibilityItems = computed<DropdownMenuItem[]>(() =>
  toggleableColumns.map(colId => ({
    label: t(`vacancy.list.columns.${colId}`),
    type: 'checkbox' as const,
    checked: columnVisibilityModel.value[colId] !== false,
    onUpdateChecked(checked: boolean) {
      const nextColumnVisibility = { ...columnVisibilityModel.value, [colId]: checked };
      columnVisibilityModel.value = nextColumnVisibility;
      void vacancyStore.updateColumnVisibility(nextColumnVisibility);
    },
    onSelect(event: Event) {
      event.preventDefault();
    }
  }))
);

const vacancies = computed(() => vacancyStore.vacancies);
const totalItems = computed(() => vacancyStore.totalItems);
const totalPages = computed(() => vacancyStore.totalPages);

const sortingModel = computed<SortingState>({
  get: () => {
    if (!queryParamsModel.value.sortBy) {
      return [];
    }

    return [
      {
        id: queryParamsModel.value.sortBy,
        desc: queryParamsModel.value.sortOrder === 'desc'
      }
    ];
  },
  set: (value: SortingState) => {
    const sort = value[0];

    if (!sort || !isSortableColumnId(sort.id)) {
      updateQueryParams({
        sortBy: undefined,
        sortOrder: undefined
      });
      return;
    }

    updateQueryParams({
      sortBy: sort.id,
      sortOrder: sort.desc ? 'desc' : 'asc'
    });
  }
});

const currentPageModel = computed({
  get: () => queryParamsModel.value.currentPage,
  set: (value: number) => {
    updateQueryParams({ currentPage: value });
  }
});

const pageSizeModel = computed({
  get: () => queryParamsModel.value.pageSize,
  set: (value: number) => {
    updateQueryParams({
      pageSize: value,
      currentPage: 1
    });
  }
});

const getRowId = (row: Vacancy) => row.id;

const formatDate = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'dd.MM.yyyy');
};

const navigateToVacancy = (vacancyId: string) => {
  navigateTo(`/vacancies/${vacancyId}`);
};

const isInNonNavigableCell = (event: Event): boolean => {
  if (!(event.target instanceof HTMLElement)) {
    return false;
  }

  return event.target.closest(`.${NON_NAVIGABLE_CELL_CLASS}`) !== null;
};

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
    meta: {
      class: {
        td: `${NON_NAVIGABLE_CELL_CLASS} cursor-default`
      }
    },
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'company',
    header: t('vacancy.list.columns.company'),
    enableSorting: false,
    meta: {
      class: {
        td: 'cursor-pointer'
      }
    },
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
    meta: {
      class: {
        td: 'cursor-pointer'
      }
    },
    cell: ({ row }: { row: { original: Vacancy } }) => {
      const status = row.original.status;
      return h(
        UBadge,
        { class: 'capitalize', variant: 'subtle', color: getStatusColor(status) },
        () => t(`vacancy.status.${status}`)
      );
    }
  },
  {
    accessorKey: 'updatedAt',
    header: createSortableHeader(t('vacancy.list.columns.updatedAt')),
    enableSorting: true,
    meta: {
      class: {
        td: 'cursor-pointer'
      }
    },
    cell: ({ row }: { row: { original: Vacancy } }) => formatDate(row.original.updatedAt)
  },
  {
    accessorKey: 'createdAt',
    header: createSortableHeader(t('vacancy.list.columns.createdAt')),
    enableSorting: true,
    meta: {
      class: {
        td: 'cursor-pointer'
      }
    },
    cell: ({ row }: { row: { original: Vacancy } }) => formatDate(row.original.createdAt)
  },
  {
    id: 'actions',
    header: () =>
      h('div', { class: 'flex justify-end' }, [
        h(
          UDropdownMenu,
          {
            items: columnVisibilityItems.value,
            content: { align: 'end' }
          },
          () =>
            h(UButton, {
              label: t('vacancy.list.columnVisibility.label'),
              color: 'neutral',
              variant: 'outline',
              trailingIcon: 'i-lucide-chevron-down',
              size: 'sm',
              class: 'cursor-pointer'
            })
        )
      ]),
    enableHiding: false,
    enableSorting: false,
    meta: {
      class: {
        th: 'text-right !px-0',
        td: `text-right ${NON_NAVIGABLE_CELL_CLASS} cursor-default`
      }
    },
    cell: ({ row }: { row: { original: Vacancy } }) => {
      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          class: 'cursor-pointer',
          'aria-label': t('vacancy.detail.actions.edit'),
          onClick: (e: Event) => {
            e.stopPropagation();
            navigateToVacancy(row.original.id);
          }
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          size: 'xs',
          class: 'cursor-pointer',
          'aria-label': t('vacancy.delete.button'),
          onClick: (e: Event) => {
            e.stopPropagation();
            emit('deleteVacancy', row.original);
          }
        })
      ]);
    }
  }
] satisfies TableColumn<Vacancy>[];

const onRowSelect = (event: Event, row: TableRow<Vacancy>) => {
  if (isInNonNavigableCell(event)) {
    return;
  }

  navigateToVacancy(row.original.id);
};
</script>
