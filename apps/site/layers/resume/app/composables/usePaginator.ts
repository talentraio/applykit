/**
 * usePaginator Composable
 *
 * Greedy packs measured blocks into pages respecting A4 dimensions
 * and keep-with-next rules for section headings.
 *
 * Related: T019 (US2)
 */

import type { MeasuredBlock, PageModel } from '../types/preview';
import { A4_HEIGHT_PX, MM_TO_PX } from '../types/preview';

/**
 * Paginator options
 */
export type PaginatorOptions = {
  /** Vertical padding (top/bottom) in mm (default: 15) */
  paddingYMm?: MaybeRef<number>;
  /** Block spacing in px (default: 10) */
  blockSpacingPx?: MaybeRef<number>;
};

/**
 * Calculate group of blocks that must stay together
 * based on keepWithNext rules
 */
function getBlockGroup(blocks: MeasuredBlock[], startIndex: number): MeasuredBlock[] {
  const group: MeasuredBlock[] = [];
  let currentIndex = startIndex;

  while (currentIndex < blocks.length) {
    const block = blocks[currentIndex];
    if (!block) break;

    group.push(block);

    // If block doesn't have keepWithNext, group ends here
    const keepWithNext = block.keepWithNext ?? 0;
    if (keepWithNext <= 0) break;

    // Add the next N blocks that should stay with this one
    const remaining = Math.min(keepWithNext, blocks.length - currentIndex - 1);
    for (let i = 0; i < remaining; i++) {
      currentIndex++;
      const nextBlock = blocks[currentIndex];
      if (nextBlock) {
        group.push(nextBlock);
      }
    }

    // Check if the last block in group also has keepWithNext
    const lastBlock = group[group.length - 1];
    if (!lastBlock?.keepWithNext) break;

    currentIndex++;
  }

  return group;
}

/**
 * Calculate total height of a block group including spacing between blocks
 * @param group - Blocks in the group
 * @param spacing - Spacing between blocks in px
 * @param isFirstOnPage - Whether this group is first on the page (no leading spacing)
 */
function getGroupHeight(group: MeasuredBlock[], spacing: number, isFirstOnPage: boolean): number {
  const blocksHeight = group.reduce((sum, block) => sum + block.height, 0);
  // Spacing between blocks within the group
  const internalSpacing = group.length > 1 ? (group.length - 1) * spacing : 0;
  // Spacing before group if not first on page
  const leadingSpacing = isFirstOnPage ? 0 : spacing;
  return blocksHeight + internalSpacing + leadingSpacing;
}

/**
 * Pack measured blocks into pages using greedy algorithm
 *
 * @param measuredBlocks - Blocks with measured heights
 * @param options - Paginator options
 * @returns Computed array of pages
 */
export function usePaginator(
  measuredBlocks: Ref<MeasuredBlock[]> | ComputedRef<MeasuredBlock[]>,
  options: PaginatorOptions = {}
) {
  const { paddingYMm = 15, blockSpacingPx = 10 } = options;

  const pages = computed<PageModel[]>(() => {
    const blocks = unref(measuredBlocks);
    if (blocks.length === 0) return [];

    // Calculate usable page height (A4 height minus top and bottom padding)
    const paddingPx = unref(paddingYMm) * MM_TO_PX;
    const usableHeight = A4_HEIGHT_PX - paddingPx * 2;
    const spacing = unref(blockSpacingPx);

    const result: PageModel[] = [];
    let currentPage: PageModel = { index: 0, blocks: [] };
    let currentPageHeight = 0;
    let blockIndex = 0;

    while (blockIndex < blocks.length) {
      // Get the group of blocks that must stay together
      const group = getBlockGroup(blocks, blockIndex);
      const isFirstOnPage = currentPage.blocks.length === 0;
      const groupHeight = getGroupHeight(group, spacing, isFirstOnPage);

      // Check if group fits on current page
      if (currentPageHeight + groupHeight <= usableHeight) {
        // Add group to current page
        currentPage.blocks.push(...group);
        currentPageHeight += groupHeight;
      } else if (currentPage.blocks.length === 0) {
        // Page is empty but group doesn't fit - add anyway (oversized content)
        currentPage.blocks.push(...group);
        currentPageHeight += groupHeight;
      } else {
        // Start new page - group will be first, so no leading spacing
        result.push(currentPage);
        const newPageGroupHeight = getGroupHeight(group, spacing, true);
        currentPage = {
          index: result.length,
          blocks: [...group]
        };
        currentPageHeight = newPageGroupHeight;
      }

      // Move past the group
      blockIndex += group.length;
    }

    // Add last page if it has content
    if (currentPage.blocks.length > 0) {
      result.push(currentPage);
    }

    return result;
  });

  const pageCount = computed(() => pages.value.length);

  const totalHeight = computed(() => {
    const blocks = unref(measuredBlocks);
    return blocks.reduce((sum, block) => sum + block.height, 0);
  });

  return {
    pages,
    pageCount,
    totalHeight
  };
}
