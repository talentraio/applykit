<template>
  <div class="resume-paginator">
    <!-- Pages -->
    <div v-for="page in pages" :key="page.index" class="resume-paginator__page">
      <ResumePaperSheet :padding-mm="paddingMm" :font-size="fontSize" :line-height="lineHeight">
        <div class="resume-paginator__blocks">
          <slot :page="page" :blocks="page.blocks" />
        </div>
      </ResumePaperSheet>

      <!-- Page number indicator -->
      <div v-if="showPageNumbers && pages.length > 1" class="resume-paginator__page-number">
        {{ page.index + 1 }} / {{ pages.length }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="pages.length === 0" class="resume-paginator__empty">
      <slot name="empty">
        <p class="text-sm text-muted">{{ $t('resume.preview.empty') }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Paginator Component
 *
 * Renders resume pages from PageModel array.
 * Each page is wrapped in PaperSheet for A4 styling.
 *
 * Related: T022 (US2)
 */

import type { PageModel } from '../../types/preview';

defineOptions({ name: 'ResumePaginator' });

withDefaults(
  defineProps<{
    /**
     * Pages to render
     */
    pages: PageModel[];
    /**
     * Show page number indicators
     * @default true
     */
    showPageNumbers?: boolean;
    /**
     * Padding inside pages (in mm)
     * @default 20
     */
    paddingMm?: number;
    /**
     * Font size in pt
     * @default 12
     */
    fontSize?: number;
    /**
     * Line height multiplier
     * @default 1.2
     */
    lineHeight?: number;
  }>(),
  {
    showPageNumbers: true,
    paddingMm: 20,
    fontSize: 12,
    lineHeight: 1.2
  }
);
</script>

<style lang="scss">
.resume-paginator {
  display: flex;
  flex-direction: column;
  gap: 2rem;

  &__page {
    position: relative;
  }

  &__blocks {
    min-height: 100%;
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

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    border: 2px dashed var(--color-neutral-300);
    border-radius: 0.5rem;
    padding: 2rem;
  }
}
</style>
