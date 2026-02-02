/**
 * useBlockMeasurer Composable
 *
 * Measures block heights for pagination by rendering blocks
 * in a hidden container and reading their dimensions.
 *
 * Related: T018 (US2)
 */

import type { BlockModel, MeasuredBlock } from '../types/preview';

/**
 * Block measurement result
 */
export type MeasurementResult = {
  /** All blocks with measured heights */
  measuredBlocks: MeasuredBlock[];
  /** Map of block IDs to heights for quick lookup */
  heightMap: Map<string, number>;
  /** Whether measurement is complete */
  isComplete: boolean;
};

/**
 * Measure block heights for pagination
 *
 * Uses a hidden measurement container to render blocks
 * and capture their heights. The container must have
 * the same width and styling as the actual preview.
 *
 * @param blocks - Blocks to measure
 * @param measurerRef - Ref to the measurement container element
 * @returns Measurement result with block heights
 */
export function useBlockMeasurer(
  blocks: Ref<BlockModel[]> | ComputedRef<BlockModel[]>,
  measurerRef: Ref<HTMLElement | null>
) {
  const heightMap = ref<Map<string, number>>(new Map());
  const isComplete = ref(false);

  const measuredBlocks = computed<MeasuredBlock[]>(() => {
    return unref(blocks).map(block => ({
      ...block,
      height: heightMap.value.get(block.id) ?? 0
    }));
  });

  /**
   * Measure a single block element by ID
   */
  function measureBlock(blockId: string): number {
    if (!measurerRef.value) return 0;

    const blockEl = measurerRef.value.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockEl) return 0;

    const rect = blockEl.getBoundingClientRect();
    return rect.height;
  }

  /**
   * Measure all blocks in the container
   */
  function measureAll(): void {
    if (!measurerRef.value) {
      isComplete.value = false;
      return;
    }

    const newHeightMap = new Map<string, number>();
    const blockElements = measurerRef.value.querySelectorAll('[data-block-id]');

    blockElements.forEach(el => {
      const blockId = el.getAttribute('data-block-id');
      if (blockId) {
        const rect = el.getBoundingClientRect();
        newHeightMap.set(blockId, rect.height);
      }
    });

    heightMap.value = newHeightMap;
    isComplete.value = newHeightMap.size === unref(blocks).length;
  }

  /**
   * Update measurement for a specific block
   */
  function updateBlockMeasurement(blockId: string): void {
    const height = measureBlock(blockId);
    if (height > 0) {
      const newMap = new Map(heightMap.value);
      newMap.set(blockId, height);
      heightMap.value = newMap;
    }
  }

  // Watch for block changes and trigger remeasurement
  watch(
    blocks,
    () => {
      // Reset completion status when blocks change
      isComplete.value = false;
      // Schedule measurement after render
      nextTick(() => {
        measureAll();
      });
    },
    { immediate: true, deep: true }
  );

  // Watch for measurer element availability
  watch(
    measurerRef,
    newEl => {
      if (newEl) {
        nextTick(() => {
          measureAll();
        });
      }
    },
    { immediate: true }
  );

  return {
    measuredBlocks,
    heightMap: computed(() => heightMap.value),
    isComplete: computed(() => isComplete.value),
    measureAll,
    measureBlock,
    updateBlockMeasurement
  };
}
