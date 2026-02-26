export type PaginatedBlock = {
  id: string;
  keepWithNext?: number;
};

export type MeasuredPaginatedBlock<TBlock extends PaginatedBlock = PaginatedBlock> = TBlock & {
  height: number;
};

export type PaginatedBlockMeasurerOptions = {
  measurementKeys?: MaybeRefOrGetter<unknown>[];
};

export function usePaginatedBlockMeasurer<TBlock extends PaginatedBlock>(
  blocks: Ref<TBlock[]> | ComputedRef<TBlock[]>,
  measurerRef: Ref<HTMLElement | null>,
  options: PaginatedBlockMeasurerOptions = {}
) {
  const { measurementKeys = [] } = options;
  const heightMap = ref<Map<string, number>>(new Map());
  const isComplete = ref(false);

  const measuredBlocks = computed<MeasuredPaginatedBlock<TBlock>[]>(() => {
    return unref(blocks).map(block => ({
      ...block,
      height: heightMap.value.get(block.id) ?? 0
    }));
  });

  const measureAll = (): void => {
    if (!measurerRef.value) {
      isComplete.value = false;
      return;
    }

    const newHeightMap = new Map<string, number>();
    const blockElements = measurerRef.value.querySelectorAll('[data-block-id]');

    blockElements.forEach(element => {
      const blockId = element.getAttribute('data-block-id');
      if (!blockId) return;

      const rect = element.getBoundingClientRect();
      newHeightMap.set(blockId, rect.height);
    });

    heightMap.value = newHeightMap;
    isComplete.value = newHeightMap.size === unref(blocks).length;
  };

  watch(
    blocks,
    () => {
      isComplete.value = false;
      nextTick(() => {
        measureAll();
      });
    },
    { immediate: true, deep: true }
  );

  watch(
    measurerRef,
    element => {
      if (!element) return;

      nextTick(() => {
        measureAll();
      });
    },
    { immediate: true }
  );

  if (measurementKeys.length > 0) {
    watch(
      measurementKeys.map(key => () => toValue(key)),
      () => {
        nextTick(() => {
          measureAll();
        });
      }
    );
  }

  return {
    measuredBlocks,
    heightMap: computed(() => heightMap.value),
    isComplete: computed(() => isComplete.value),
    measureAll
  };
}
