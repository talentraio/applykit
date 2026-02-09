<template>
  <div
    class="vacancy-list-content-toolbar relative isolate mb-4"
    :class="[isMobile ? 'sticky top-[72px] z-20 rounded-lg bg-default/95 py-1 backdrop-blur' : '']"
  >
    <div
      v-if="isMobile"
      class="pointer-events-none absolute -top-2 -bottom-2 left-1/2 -z-10 w-screen -translate-x-1/2 bg-default"
    />

    <div v-if="!isMobile" class="flex items-center gap-3">
      <!-- Search -->
      <UInput
        v-model="searchInputModel"
        :placeholder="$t('vacancy.list.search.placeholder')"
        icon="i-lucide-search"
        class="w-[220px] max-w-[220px]"
      >
        <template #trailing>
          <UButton
            v-if="searchInputModel.length > 0"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            size="xs"
            square
            :aria-label="$t('common.clear')"
            @click="handleClearSearch"
          />
        </template>
      </UInput>

      <!-- Status filter -->
      <USelectMenu
        v-model="statusFilterModel"
        :items="statusOptions"
        value-key="value"
        multiple
        clear
        :search-input="false"
        :placeholder="$t('vacancy.list.filter.statusPlaceholder')"
        class="w-[220px] max-w-[220px]"
      />

      <div class="ml-auto flex items-center gap-3">
        <!-- Bulk action -->
        <UButton
          v-if="selectedCount > 0"
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          size="md"
          square
          :aria-label="$t('vacancy.list.bulkActions.deleteSelected')"
          @click="handleBulkDelete"
        />

        <UButton color="primary" icon="i-lucide-plus" size="sm" class="h-8" to="/vacancies/new">
          {{ $t('vacancy.list.createButton') }}
        </UButton>
      </div>
    </div>

    <div v-else class="vacancy-list-content-toolbar__mobile space-y-3">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-sliders-horizontal"
        class="w-full justify-start"
        :aria-label="$t('common.filter')"
        @click="toggleMobileFilters"
      />

      <div
        v-if="isMobileFiltersOpen"
        class="space-y-3 rounded-lg border border-default bg-default p-3"
      >
        <UInput
          v-model="searchInputModel"
          :placeholder="$t('vacancy.list.search.placeholder')"
          icon="i-lucide-search"
          class="w-full"
        >
          <template #trailing>
            <UButton
              v-if="searchInputModel.length > 0"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              size="xs"
              square
              :aria-label="$t('common.clear')"
              @click="handleClearSearch"
            />
          </template>
        </UInput>

        <USelectMenu
          v-model="statusFilterModel"
          :items="statusOptions"
          value-key="value"
          multiple
          clear
          :search-input="false"
          :placeholder="$t('vacancy.list.filter.statusPlaceholder')"
          class="w-full"
        />

        <USelectMenu
          v-model="sortModel"
          :items="sortOptions"
          value-key="value"
          clear
          :search-input="false"
          :placeholder="$t('vacancy.list.sort.placeholder')"
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VacancyListQuery, VacancyStatus } from '@int/schema';
import { VACANCY_STATUS_VALUES } from '@int/schema';

type RowSelectionState = Record<string, boolean>;
type SortOptionValue = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc';
type StatusOption = {
  label: string;
  value: VacancyStatus;
};
type SortOption = {
  label: string;
  value: SortOptionValue;
};

type Props = {
  isMobile: boolean;
};

defineOptions({ name: 'VacancyListContentToolbar' });

const props = defineProps<Props>();
const emit = defineEmits<{
  bulkDelete: [];
}>();
const { t } = useI18n();

const queryParamsModel = defineModel<VacancyListQuery>('queryParams', { required: true });
const rowSelectionModel = defineModel<RowSelectionState>('rowSelection', { required: true });
const searchInput = ref(queryParamsModel.value.search ?? '');
const isMobileFiltersOpen = ref(false);

const updateQueryParams = (partial: Partial<VacancyListQuery>) => {
  queryParamsModel.value = {
    ...queryParamsModel.value,
    ...partial
  };
};

const applySearchQuery = useDebounceFn((value: string) => {
  if (value.length >= 3 || value.length === 0) {
    updateQueryParams({
      search: value.length === 0 ? undefined : value,
      currentPage: 1
    });
  }
}, 1000);

const selectedCount = computed(() => Object.keys(rowSelectionModel.value).length);
const isMobile = computed(() => props.isMobile);

const statusOptions = computed<StatusOption[]>(() =>
  VACANCY_STATUS_VALUES.map(status => ({
    label: t(`vacancy.status.${status}`),
    value: status
  }))
);
const sortOptions = computed<SortOption[]>(() => [
  { label: t('vacancy.list.sort.updatedAtDesc'), value: 'updatedAt_desc' },
  { label: t('vacancy.list.sort.updatedAtAsc'), value: 'updatedAt_asc' },
  { label: t('vacancy.list.sort.createdAtDesc'), value: 'createdAt_desc' },
  { label: t('vacancy.list.sort.createdAtAsc'), value: 'createdAt_asc' }
]);

const searchInputModel = computed({
  get: () => searchInput.value,
  set: (value: string) => {
    searchInput.value = value;
    applySearchQuery(value);
  }
});

const statusFilterModel = computed({
  get: () => queryParamsModel.value.status ?? [],
  set: (value: VacancyStatus[]) => {
    updateQueryParams({
      status: value.length > 0 ? value : undefined,
      currentPage: 1
    });
  }
});

const sortModel = computed({
  get: (): SortOptionValue | undefined => {
    const { sortBy, sortOrder } = queryParamsModel.value;

    if (!sortBy || !sortOrder) {
      return undefined;
    }

    if (sortBy === 'updatedAt' && sortOrder === 'desc') return 'updatedAt_desc';
    if (sortBy === 'updatedAt' && sortOrder === 'asc') return 'updatedAt_asc';
    if (sortBy === 'createdAt' && sortOrder === 'desc') return 'createdAt_desc';
    if (sortBy === 'createdAt' && sortOrder === 'asc') return 'createdAt_asc';

    return undefined;
  },
  set: (value: SortOptionValue | undefined) => {
    if (!value) {
      updateQueryParams({
        sortBy: undefined,
        sortOrder: undefined,
        currentPage: 1
      });
      return;
    }

    const sortMap: Record<
      SortOptionValue,
      { sortBy: NonNullable<VacancyListQuery['sortBy']>; sortOrder: 'asc' | 'desc' }
    > = {
      updatedAt_desc: { sortBy: 'updatedAt', sortOrder: 'desc' },
      updatedAt_asc: { sortBy: 'updatedAt', sortOrder: 'asc' },
      createdAt_desc: { sortBy: 'createdAt', sortOrder: 'desc' },
      createdAt_asc: { sortBy: 'createdAt', sortOrder: 'asc' }
    };
    const mapped = sortMap[value];

    updateQueryParams({
      sortBy: mapped.sortBy,
      sortOrder: mapped.sortOrder,
      currentPage: 1
    });
  }
});

const handleBulkDelete = () => {
  emit('bulkDelete');
};

const handleClearSearch = () => {
  searchInput.value = '';
  applySearchQuery('');
  updateQueryParams({
    search: undefined,
    currentPage: 1
  });
};

const toggleMobileFilters = () => {
  isMobileFiltersOpen.value = !isMobileFiltersOpen.value;
};
</script>
