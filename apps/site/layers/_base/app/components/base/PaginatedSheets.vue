<template>
  <div class="base-paginated-sheets" :data-ready="isReady ? 'true' : 'false'">
    <div
      v-if="isInternalMode"
      ref="measurerRef"
      class="base-paginated-sheets__measurer"
      aria-hidden="true"
    >
      <BasePaperSheet
        class="base-paginated-sheets__measurer-sheet"
        :margin-x-mm="marginXMm"
        :margin-y-mm="marginYMm"
        :font-size="fontSize"
        :line-height="lineHeight"
        :min-scale="1"
        :max-scale="1"
        :elevated="false"
      >
        <slot name="content" :blocks="internalBlocks" :is-measurement="true" />
      </BasePaperSheet>
    </div>

    <BasePaperSheet
      v-if="showLoadingSheet"
      class="base-paginated-sheets__loading-sheet"
      :margin-x-mm="marginXMm"
      :margin-y-mm="marginYMm"
      :font-size="fontSize"
      :line-height="lineHeight"
      :min-scale="minScale"
      :max-scale="maxScale"
      :elevated="elevated"
      :loading="true"
    />

    <div v-for="page in visiblePages" :key="page.index" class="base-paginated-sheets__page-wrapper">
      <BasePaperSheet
        class="base-paginated-sheets__page-sheet"
        :margin-x-mm="marginXMm"
        :margin-y-mm="marginYMm"
        :font-size="fontSize"
        :line-height="lineHeight"
        :min-scale="minScale"
        :max-scale="maxScale"
        :elevated="elevated"
      >
        <slot
          v-if="isInternalMode"
          name="content"
          :page="page"
          :blocks="page.blocks"
          :is-measurement="false"
        />
        <slot v-else name="page" :page="page" :blocks="page.blocks" />
      </BasePaperSheet>

      <div
        v-if="showPageNumbers && visiblePages.length > 1"
        class="base-paginated-sheets__page-number"
      >
        {{ page.index + 1 }} / {{ visiblePages.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TBlock extends PaginatedBlock">
import type { PaginatedBlock } from '@site/base/app/composables/usePaginatedBlockMeasurer';
import type { PaginatedPage } from '@site/base/app/composables/usePaginatedPages';
import BasePaperSheet from '@site/base/app/components/base/PaperSheet/index.vue';
import { usePaginatedBlockMeasurer } from '@site/base/app/composables/usePaginatedBlockMeasurer';
import { usePaginatedPages } from '@site/base/app/composables/usePaginatedPages';

defineOptions({ name: 'BasePaginatedSheets' });

const props = withDefaults(
  defineProps<{
    pages?: PaginatedPage<TBlock>[];
    blocks?: TBlock[];
    marginXMm: number;
    marginYMm: number;
    fontSize: number;
    lineHeight: number;
    blockSpacingPx?: number;
    showPageNumbers?: boolean;
    showLoadingWhenMeasuring?: boolean;
    minScale?: number;
    maxScale?: number;
    elevated?: boolean;
  }>(),
  {
    showPageNumbers: true,
    minScale: 0.25,
    maxScale: 1,
    elevated: true,
    blockSpacingPx: 0,
    showLoadingWhenMeasuring: false
  }
);

const emit = defineEmits<{
  readyChange: [ready: boolean];
}>();

defineSlots<{
  page: (props: { page: PaginatedPage<TBlock>; blocks: TBlock[] }) => unknown;
  content: (props: {
    page?: PaginatedPage<TBlock>;
    blocks: TBlock[];
    isMeasurement: boolean;
  }) => unknown;
}>();

const measurerRef = ref<HTMLElement | null>(null);
const isInternalMode = computed(() => props.blocks !== undefined);
const internalBlocks = computed<TBlock[]>(() => props.blocks ?? []);
const marginXMm = toRef(() => props.marginXMm);
const marginYMm = toRef(() => props.marginYMm);
const fontSize = toRef(() => props.fontSize);
const lineHeight = toRef(() => props.lineHeight);
const blockSpacingPx = toRef(() => props.blockSpacingPx);

const { measuredBlocks, isComplete, measureAll } = usePaginatedBlockMeasurer(
  internalBlocks,
  measurerRef,
  {
    measurementKeys: [marginXMm, marginYMm, fontSize, lineHeight, blockSpacingPx]
  }
);

const { pages: internalPages } = usePaginatedPages(measuredBlocks, {
  paddingYMm: marginYMm,
  blockSpacingPx
});

const resolvedPages = computed<PaginatedPage<TBlock>[]>(() => {
  if (isInternalMode.value) {
    return internalPages.value;
  }

  return props.pages ?? [];
});

const visiblePages = computed<PaginatedPage<TBlock>[]>(() => {
  if (!isInternalMode.value) {
    return resolvedPages.value;
  }

  if (!isComplete.value) {
    return [];
  }

  return resolvedPages.value;
});

const isReady = computed(() => {
  if (!isInternalMode.value) {
    return true;
  }

  return isComplete.value;
});

const showLoadingSheet = computed(() => {
  if (!props.showLoadingWhenMeasuring) return false;
  if (!isInternalMode.value) return false;
  if (internalBlocks.value.length === 0) return false;

  return !isReady.value;
});

const remeasureAfterFontLoad = (): void => {
  nextTick(() => {
    measureAll();
  });
};

watch(
  isReady,
  ready => {
    emit('readyChange', ready);
  },
  { immediate: true }
);

onMounted(() => {
  if (!import.meta.client || !isInternalMode.value || !('fonts' in document)) return;

  document.fonts.ready.then(() => {
    remeasureAfterFontLoad();
  });

  document.fonts.addEventListener('loadingdone', remeasureAfterFontLoad);
});

onBeforeUnmount(() => {
  if (!import.meta.client || !isInternalMode.value || !('fonts' in document)) return;
  document.fonts.removeEventListener('loadingdone', remeasureAfterFontLoad);
});
</script>

<style lang="scss">
.base-paginated-sheets {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;

  &__page-wrapper {
    position: relative;
    width: 100%;
    flex-shrink: 0;
  }

  &__measurer {
    position: absolute;
    top: 0;
    left: -9999px;
    visibility: hidden;
    pointer-events: none;
  }

  &__page-sheet {
    width: 100%;
  }

  &__page-number {
    position: absolute;
    bottom: -1.5rem;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.75rem;
    color: var(--color-neutral-500);
    white-space: nowrap;
  }
}
</style>
