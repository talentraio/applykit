import type { MeasuredPaginatedBlock, PaginatedBlock } from './usePaginatedBlockMeasurer';
import { A4_HEIGHT_PX, MM_TO_PX } from '@site/base/app/constants/paper';

export type PaginatedPage<TBlock extends PaginatedBlock = PaginatedBlock> = {
  index: number;
  blocks: TBlock[];
};

export type PaginatedPagesOptions = {
  paddingYMm?: MaybeRefOrGetter<number>;
  blockSpacingPx?: MaybeRefOrGetter<number>;
  pageHeightPx?: MaybeRefOrGetter<number>;
};

const getBlockGroup = <TBlock extends PaginatedBlock>(
  blocks: MeasuredPaginatedBlock<TBlock>[],
  startIndex: number
): MeasuredPaginatedBlock<TBlock>[] => {
  const group: MeasuredPaginatedBlock<TBlock>[] = [];
  let currentIndex = startIndex;

  while (currentIndex < blocks.length) {
    const block = blocks[currentIndex];
    if (!block) break;

    group.push(block);

    const keepWithNext = block.keepWithNext ?? 0;
    if (keepWithNext <= 0) break;

    const remaining = Math.min(keepWithNext, blocks.length - currentIndex - 1);

    for (let i = 0; i < remaining; i += 1) {
      currentIndex += 1;
      const nextBlock = blocks[currentIndex];
      if (nextBlock) {
        group.push(nextBlock);
      }
    }

    const lastBlock = group[group.length - 1];
    if (!lastBlock?.keepWithNext) break;

    currentIndex += 1;
  }

  return group;
};

const getGroupHeight = <TBlock extends PaginatedBlock>(
  group: MeasuredPaginatedBlock<TBlock>[],
  spacing: number,
  isFirstOnPage: boolean
): number => {
  const blocksHeight = group.reduce((sum, block) => sum + block.height, 0);
  const internalSpacing = group.length > 1 ? (group.length - 1) * spacing : 0;
  const leadingSpacing = isFirstOnPage ? 0 : spacing;

  return blocksHeight + internalSpacing + leadingSpacing;
};

export function usePaginatedPages<TBlock extends PaginatedBlock>(
  measuredBlocks:
    | Ref<MeasuredPaginatedBlock<TBlock>[]>
    | ComputedRef<MeasuredPaginatedBlock<TBlock>[]>,
  options: PaginatedPagesOptions = {}
) {
  const { paddingYMm = 15, blockSpacingPx = 10, pageHeightPx = A4_HEIGHT_PX } = options;

  const pages = computed<PaginatedPage<TBlock>[]>(() => {
    const blocks = unref(measuredBlocks);
    if (blocks.length === 0) return [];

    const paddingPx = toValue(paddingYMm) * MM_TO_PX;
    const usableHeight = toValue(pageHeightPx) - paddingPx * 2;
    const spacing = toValue(blockSpacingPx);

    const result: PaginatedPage<TBlock>[] = [];
    let currentPage: PaginatedPage<TBlock> = { index: 0, blocks: [] };
    let currentPageHeight = 0;
    let blockIndex = 0;

    while (blockIndex < blocks.length) {
      const group = getBlockGroup(blocks, blockIndex);
      const isFirstOnPage = currentPage.blocks.length === 0;
      const groupHeight = getGroupHeight(group, spacing, isFirstOnPage);

      if (currentPageHeight + groupHeight <= usableHeight) {
        currentPage.blocks.push(...group);
        currentPageHeight += groupHeight;
      } else if (currentPage.blocks.length === 0) {
        currentPage.blocks.push(...group);
        currentPageHeight += groupHeight;
      } else {
        result.push(currentPage);

        const newPageGroupHeight = getGroupHeight(group, spacing, true);
        currentPage = {
          index: result.length,
          blocks: [...group]
        };
        currentPageHeight = newPageGroupHeight;
      }

      blockIndex += group.length;
    }

    if (currentPage.blocks.length > 0) {
      result.push(currentPage);
    }

    return result;
  });

  return {
    pages,
    pageCount: computed(() => pages.value.length)
  };
}
