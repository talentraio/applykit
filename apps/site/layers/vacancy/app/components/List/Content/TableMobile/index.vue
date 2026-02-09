<template>
  <div
    class="vacancy-list-content-table-mobile pb-4"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
    @touchend.passive="handleTouchEnd"
    @touchcancel.passive="handleTouchCancel"
  >
    <div class="vacancy-list-content-table-mobile__list space-y-2" :style="listStyle">
      <VacancyListContentTableMobileCard
        v-for="vacancy in vacancies"
        :key="vacancy.id"
        :vacancy="vacancy"
        :selected="!!rowSelectionModel[vacancy.id]"
        @open="openVacancy"
        @delete="requestDelete"
        @select="handleSelect"
      />
    </div>

    <div
      v-if="vacancies.length > 0 && (canLoadMore || isLoadingMore)"
      class="vacancy-list-content-table-mobile__load-more flex items-end justify-center overflow-hidden"
      :style="loadMoreAreaStyle"
    >
      <div
        v-if="isLoadingMore"
        class="vacancy-list-content-table-mobile__loader flex min-h-[92px] w-full items-center justify-center gap-3 text-muted"
      >
        <UIcon name="i-lucide-loader-circle" class="h-5 w-5 animate-spin" />
        <span class="text-sm">{{ $t('vacancy.list.loadingMore') }}</span>
      </div>

      <p v-else class="pb-2 text-center text-xs text-muted">
        {{ $t('vacancy.list.loadMoreHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Vacancy, VacancyListQuery } from '@int/schema';

type RowSelectionState = Record<string, boolean>;

type Props = {
  vacancies: Vacancy[];
  canLoadMore: boolean;
  isLoadingMore: boolean;
};

type Emits = {
  ready: [];
  loadMore: [];
  deleteVacancy: [vacancy: Vacancy];
};

defineOptions({ name: 'VacancyListContentTableMobile' });

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

defineModel<VacancyListQuery>('queryParams', { required: true });
const rowSelectionModel = defineModel<RowSelectionState>('rowSelection', { required: true });

const SWIPE_UP_THRESHOLD = 48;
const MAX_PULL_DISTANCE = 108;
const PULL_RESISTANCE = 0.55;
const LIST_SHIFT_RATIO = 0.22;
const LOAD_MORE_HINT_HEIGHT = 28;
const LOAD_MORE_LOADING_HEIGHT = 92;
const touchStartY = ref<number | null>(null);
const lastTouchY = ref<number | null>(null);
const wasAtBottomOnTouchStart = ref(false);
const pullUpDistance = ref(0);

const openVacancy = (vacancy: Vacancy) => {
  navigateTo(`/vacancies/${vacancy.id}`);
};

const requestDelete = (vacancy: Vacancy) => {
  emit('deleteVacancy', vacancy);
};

const handleSelect = ({ id, selected }: { id: string; selected: boolean }) => {
  if (selected) {
    rowSelectionModel.value = {
      ...rowSelectionModel.value,
      [id]: true
    };
    return;
  }

  const { [id]: _removed, ...rest } = rowSelectionModel.value;
  rowSelectionModel.value = rest;
};

const isPageAtBottom = (): boolean => {
  if (!import.meta.client) {
    return false;
  }

  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
};

const getFirstTouch = (touches: TouchList): Touch | null => {
  if (touches.length === 0) {
    return null;
  }

  return touches[0] ?? touches.item(0);
};

const resetPullState = () => {
  touchStartY.value = null;
  lastTouchY.value = null;
  wasAtBottomOnTouchStart.value = false;
  pullUpDistance.value = 0;
};

const resetTouchTracking = () => {
  touchStartY.value = null;
  lastTouchY.value = null;
  wasAtBottomOnTouchStart.value = false;
};

const updatePullDistance = (currentTouchY: number) => {
  if (touchStartY.value === null || !props.canLoadMore || props.isLoadingMore) {
    pullUpDistance.value = 0;
    return;
  }

  const deltaY = touchStartY.value - currentTouchY;
  const isAtBottom = wasAtBottomOnTouchStart.value || isPageAtBottom();

  if (!isAtBottom || deltaY <= 0) {
    pullUpDistance.value = 0;
    return;
  }

  pullUpDistance.value = Math.min(MAX_PULL_DISTANCE, deltaY * PULL_RESISTANCE);
};

const handleTouchStart = (event: TouchEvent) => {
  const touch = getFirstTouch(event.touches);

  if (!touch) {
    return;
  }

  touchStartY.value = touch.clientY;
  lastTouchY.value = touch.clientY;
  wasAtBottomOnTouchStart.value = isPageAtBottom();
  pullUpDistance.value = 0;
};

const handleTouchMove = (event: TouchEvent) => {
  const touch = getFirstTouch(event.touches);

  if (!touch) {
    return;
  }

  lastTouchY.value = touch.clientY;
  updatePullDistance(touch.clientY);
};

const handleTouchEnd = (event: TouchEvent) => {
  const touch = getFirstTouch(event.changedTouches);
  const endY = touch?.clientY ?? lastTouchY.value;

  if (touchStartY.value === null || endY === null) {
    resetPullState();
    return;
  }

  const deltaY = touchStartY.value - endY;
  const isSwipeUp = deltaY >= SWIPE_UP_THRESHOLD;
  const isAtBottom = wasAtBottomOnTouchStart.value || isPageAtBottom();
  const shouldLoad = isSwipeUp && isAtBottom && props.canLoadMore && !props.isLoadingMore;

  if (shouldLoad) {
    pullUpDistance.value = Math.min(MAX_PULL_DISTANCE, Math.max(0, deltaY) * PULL_RESISTANCE);
    resetTouchTracking();
    emit('loadMore');
    window.setTimeout(() => {
      pullUpDistance.value = 0;
    }, 220);
    return;
  }

  resetPullState();
};

const handleTouchCancel = () => {
  resetPullState();
};

onMounted(() => {
  emit('ready');
});

const listStyle = computed(() => {
  const shiftY = Math.round(pullUpDistance.value * LIST_SHIFT_RATIO);

  return {
    transform: `translateY(-${shiftY}px)`,
    transition: touchStartY.value === null ? 'transform 180ms ease-out' : 'transform 60ms linear'
  };
});

const loadMoreAreaMinHeight = computed(() => {
  if (props.vacancies.length === 0) {
    return 0;
  }

  if (props.isLoadingMore) {
    return LOAD_MORE_LOADING_HEIGHT;
  }

  if (props.canLoadMore) {
    return LOAD_MORE_HINT_HEIGHT + Math.round(pullUpDistance.value);
  }

  return 0;
});

const loadMoreAreaStyle = computed(() => ({
  minHeight: `${loadMoreAreaMinHeight.value}px`,
  transition: touchStartY.value === null ? 'min-height 180ms ease-out' : 'min-height 60ms linear'
}));
</script>
