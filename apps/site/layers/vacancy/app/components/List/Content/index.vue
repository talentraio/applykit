<template>
  <div class="vacancy-list-content flex flex-col md:h-full md:min-h-0 md:overflow-hidden">
    <VacancyListContentToolbar
      v-model:query-params="queryParamsViewModel"
      v-model:row-selection="rowSelectionModel"
      class="shrink-0"
      :is-mobile="isMobile"
      @bulk-delete="handleBulkDelete"
    />

    <div v-if="!isMobile" class="min-h-0 flex flex-1">
      <VacancyListContentTableDesktop
        v-model:query-params="queryParamsViewModel"
        v-model:row-selection="rowSelectionModel"
        v-model:column-visibility="columnVisibilityModel"
        class="min-h-0 flex-1"
        @delete-vacancy="handleDeleteVacancy"
      />
    </div>

    <VacancyListContentTableMobile
      v-else
      v-model:query-params="queryParamsViewModel"
      v-model:row-selection="rowSelectionModel"
      class="w-full"
      :vacancies="mobileVacancies"
      :can-load-more="canLoadMoreMobile"
      :is-loading-more="isLoadingMoreMobile"
      @ready="handleMobileReady"
      @load-more="handleMobileLoadMore"
      @delete-vacancy="handleDeleteVacancy"
    />

    <UBanner
      v-if="showMobileSwipeHint"
      color="primary"
      icon="i-lucide-hand"
      :title="$t('vacancy.list.mobileSwipeHint.title')"
      :ui="{
        container: 'h-auto min-h-12 items-start py-2',
        center: 'min-w-0 items-start',
        right: 'items-start',
        title: 'whitespace-normal break-words leading-5'
      }"
      class="fixed inset-x-4 bottom-4 z-20 md:hidden"
    >
      <template #actions>
        <UButton color="neutral" variant="ghost" size="xs" @click="handleDismissMobileSwipeHint">
          {{ $t('vacancy.list.mobileSwipeHint.dismiss') }}
        </UButton>
      </template>
    </UBanner>

    <UButton
      v-if="isMobile && selectedCount > 0"
      color="error"
      variant="soft"
      size="xl"
      square
      class="fixed bottom-[30px] right-[30px] z-30 h-16 w-16 rounded-full !p-0 shadow-lg !flex !items-center !justify-center"
      :aria-label="$t('vacancy.list.bulkActions.deleteSelected')"
      @click="handleBulkDelete"
    >
      <UIcon name="i-lucide-trash-2" class="size-6" />
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { Vacancy, VacancyListColumnVisibility, VacancyListQuery } from '@int/schema';

type RowSelectionState = Record<string, boolean>;
type VisibilityState = VacancyListColumnVisibility;
type QueryUpdateMode = 'replace' | 'append';

type Props = {
  runQuery: (query: VacancyListQuery) => Promise<void>;
};

type Emits = {
  bulkDelete: [ids: string[]];
  deleteVacancy: [vacancy: Vacancy];
};
type Exposed = {
  resetSelection: () => void;
  syncVisibleItems: () => void;
};

defineOptions({ name: 'VacancyListContent' });

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const queryParamsModel = defineModel<VacancyListQuery>('queryParams', { required: true });
const vacancyStore = useVacancyStore();
const { isMobile } = useDevice();

const rowSelectionModel = ref<RowSelectionState>({});
const columnVisibilityModel = ref<VisibilityState>(
  vacancyStore.vacancyListResponse?.columnVisibility
    ? { ...vacancyStore.vacancyListResponse.columnVisibility }
    : {}
);
const mobileVacancies = ref<Vacancy[]>([...vacancyStore.vacancies]);
const isLoadingMoreMobile = ref(false);
const queryRunVersion = ref(0);
const isHydrated = ref(false);
const mobileSwipeHintDismissed = useLocalStorage<boolean>(
  'vacancy-list-mobile-swipe-hint-dismissed',
  false
);
const selectedCount = computed(() => Object.keys(rowSelectionModel.value).length);
const showMobileSwipeHint = computed(() => {
  return (
    isHydrated.value &&
    isMobile &&
    mobileVacancies.value.length > 0 &&
    !mobileSwipeHintDismissed.value
  );
});

const canLoadMoreMobile = computed(() => {
  return (
    queryParamsModel.value.currentPage < vacancyStore.totalPages && vacancyStore.totalPages > 0
  );
});

const normalizeMobileQuery = (query: VacancyListQuery): VacancyListQuery => ({
  ...query,
  pageSize: 25
});

const replaceMobileVacanciesFromStore = () => {
  mobileVacancies.value = [...vacancyStore.vacancies];
};

const appendMobileVacanciesFromStore = () => {
  const existingIds = new Set(mobileVacancies.value.map(vacancy => vacancy.id));
  const nextItems = vacancyStore.vacancies.filter(vacancy => !existingIds.has(vacancy.id));
  mobileVacancies.value = [...mobileVacancies.value, ...nextItems];
};

const applyQuery = async (nextQuery: VacancyListQuery, mode: QueryUpdateMode): Promise<void> => {
  const currentVersion = queryRunVersion.value + 1;
  queryRunVersion.value = currentVersion;

  if (mode === 'append') {
    isLoadingMoreMobile.value = true;
  }

  queryParamsModel.value = nextQuery;

  try {
    await props.runQuery(nextQuery);

    if (!isMobile) {
      return;
    }

    if (currentVersion !== queryRunVersion.value) {
      return;
    }

    if (mode === 'append') {
      appendMobileVacanciesFromStore();
      return;
    }

    replaceMobileVacanciesFromStore();
  } finally {
    if (mode === 'append') {
      isLoadingMoreMobile.value = false;
    }
  }
};

const queryParamsViewModel = computed({
  get: () => queryParamsModel.value,
  set: value => {
    const nextQuery = isMobile ? normalizeMobileQuery(value) : value;
    void applyQuery(nextQuery, 'replace');
  }
});

const handleBulkDelete = () => {
  emit('bulkDelete', Object.keys(rowSelectionModel.value));
};

const handleDeleteVacancy = (vacancy: Vacancy) => {
  emit('deleteVacancy', vacancy);
};
const handleDismissMobileSwipeHint = () => {
  mobileSwipeHintDismissed.value = true;
};

const handleMobileReady = async () => {
  const mobileQuery = normalizeMobileQuery({
    ...queryParamsModel.value,
    currentPage: 1
  });
  const isSameQuery =
    mobileQuery.currentPage === queryParamsModel.value.currentPage &&
    mobileQuery.pageSize === queryParamsModel.value.pageSize &&
    mobileQuery.search === queryParamsModel.value.search &&
    mobileQuery.sortBy === queryParamsModel.value.sortBy &&
    mobileQuery.sortOrder === queryParamsModel.value.sortOrder &&
    JSON.stringify(mobileQuery.status ?? []) ===
      JSON.stringify(queryParamsModel.value.status ?? []);

  if (isSameQuery) {
    replaceMobileVacanciesFromStore();
    return;
  }

  await applyQuery(mobileQuery, 'replace');
};

const handleMobileLoadMore = async () => {
  if (isLoadingMoreMobile.value || !canLoadMoreMobile.value) {
    return;
  }

  const nextQuery = normalizeMobileQuery({
    ...queryParamsModel.value,
    currentPage: queryParamsModel.value.currentPage + 1
  });
  await applyQuery(nextQuery, 'append');
};

const resetSelection = () => {
  rowSelectionModel.value = {};
};

const syncVisibleItems = () => {
  replaceMobileVacanciesFromStore();
};

onMounted(() => {
  isHydrated.value = true;
});

defineExpose<Exposed>({ resetSelection, syncVisibleItems });
</script>
