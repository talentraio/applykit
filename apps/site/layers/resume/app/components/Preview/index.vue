<template>
  <div ref="containerRef" class="resume-preview">
    <!-- Hidden measurement container (same width as page, scale=1) -->
    <div ref="measurerRef" class="resume-preview__measurer" aria-hidden="true">
      <div class="resume-preview__measurer-content" :style="measurerContentStyle">
        <!-- Render all blocks for measurement -->
        <template v-for="block in blocks" :key="block.id">
          <div :data-block-id="block.id" class="resume-preview__block">
            <BlockRenderer :block="block" :type="type" :photo-url="photoUrl" />
          </div>
        </template>
      </div>
    </div>

    <!-- Paginated pages -->
    <div class="resume-preview__pages" :style="pagesContainerStyle">
      <div
        v-for="page in pages"
        :key="page.index"
        class="resume-preview__page-wrapper"
        :style="pageWrapperStyle"
      >
        <div class="resume-preview__page" :style="pageStyle">
          <div class="resume-preview__page-content" :style="pageContentStyle">
            <template v-for="block in page.blocks" :key="block.id">
              <div class="resume-preview__block">
                <BlockRenderer :block="block" :type="type" :photo-url="photoUrl" />
              </div>
            </template>
          </div>
        </div>

        <!-- Page number indicator -->
        <div v-if="pages.length > 1" class="resume-preview__page-number">
          {{ page.index + 1 }} / {{ pages.length }}
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="blocks.length === 0" class="resume-preview__empty">
      <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
      <p class="mt-4 text-sm text-muted">{{ $t('resume.preview.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview Component
 *
 * FlowCV-style A4 preview with zoom scaling and block-based pagination.
 *
 * Features:
 * - Fixed A4 pages with zoom-based scaling (no content reflow)
 * - Deterministic pagination based on measured block heights
 * - Keep-with-next rules for section headings
 * - Multi-page support with smooth scrolling
 *
 * Related: T025 (US2)
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../../types/preview';
import { useBlockMeasurer } from '../../composables/useBlockMeasurer';
import { usePageScale } from '../../composables/usePageScale';
import { usePaginator } from '../../composables/usePaginator';
import { useResumeBlocks } from '../../composables/useResumeBlocks';
import { A4_HEIGHT_PX, A4_WIDTH_PX, MM_TO_PX } from '../../types/preview';
import BlockRenderer from './BlockRenderer.vue';

defineOptions({ name: 'ResumePreview' });

const props = withDefaults(
  defineProps<{
    /**
     * Resume content to display
     */
    content: ResumeContent;
    /**
     * Preview type: 'ats' or 'human'
     * @default 'ats'
     */
    type?: PreviewType;
    /**
     * Format settings (margins, fontSize, lineHeight, blockSpacing)
     */
    settings?: Partial<ResumeFormatSettings>;
    /**
     * Profile photo URL for human view
     */
    photoUrl?: string;
  }>(),
  {
    type: 'ats',
    settings: () => ({})
  }
);

// Merge with defaults
const settings = computed<ResumeFormatSettings>(() => ({
  margins: props.settings?.margins ?? 20,
  fontSize: props.settings?.fontSize ?? 12,
  lineHeight: props.settings?.lineHeight ?? 1.2,
  blockSpacing: props.settings?.blockSpacing ?? 5
}));

// Convert padding to pixels
const paddingPx = computed(() => settings.value.margins * MM_TO_PX);

// Refs
const containerRef = ref<HTMLElement | null>(null);
const measurerRef = ref<HTMLElement | null>(null);

// Convert content to blocks
const contentRef = computed(() => props.content);
const { blocks } = useResumeBlocks(contentRef);

// Measure block heights
const { measuredBlocks } = useBlockMeasurer(blocks, measurerRef);

// Paginate blocks into pages
const { pages } = usePaginator(measuredBlocks, {
  paddingMm: settings.value.margins
});

// Calculate scale based on container width
const { scale } = usePageScale(containerRef);

// Measurer content style (same width as A4 page inner width)
const measurerContentStyle = computed(() => ({
  width: `${A4_WIDTH_PX - paddingPx.value * 2}px`,
  fontSize: `${settings.value.fontSize}pt`,
  lineHeight: settings.value.lineHeight
}));

// Container for all pages
const pagesContainerStyle = computed(() => ({
  '--page-scale': scale.value,
  '--page-width': `${A4_WIDTH_PX}px`,
  '--page-height': `${A4_HEIGHT_PX}px`,
  '--page-pad': `${paddingPx.value}px`,
  '--font-size': `${settings.value.fontSize}pt`,
  '--line-height': settings.value.lineHeight
}));

// Wrapper for each page (reserves space for scaled page)
const pageWrapperStyle = computed(() => ({
  width: `${A4_WIDTH_PX * scale.value}px`,
  height: `${A4_HEIGHT_PX * scale.value}px`
}));

// Page style with scaling
const pageStyle = computed(() => ({
  width: `${A4_WIDTH_PX}px`,
  height: `${A4_HEIGHT_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left'
}));

// Page content padding style
const pageContentStyle = computed(() => ({
  padding: `${paddingPx.value}px`,
  fontSize: `${settings.value.fontSize}pt`,
  lineHeight: settings.value.lineHeight
}));
</script>

<style lang="scss">
.resume-preview {
  width: 100%;
  position: relative;

  // Hidden measurer - same styling as pages but invisible
  &__measurer {
    position: absolute;
    top: 0;
    left: -9999px;
    visibility: hidden;
    pointer-events: none;
  }

  &__measurer-content {
    background: white;
    color: #1f2937;
  }

  // Pages container
  &__pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  // Page wrapper reserves space for scaled page
  &__page-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  // Actual page with fixed A4 dimensions
  &__page {
    background: white;
    color: #1f2937;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 10%),
      0 2px 4px -1px rgb(0 0 0 / 6%);
    border: 1px solid #e5e7eb;
    box-sizing: border-box;
    overflow: hidden;
  }

  &__page-content {
    box-sizing: border-box;
    height: 100%;

    // Override dark mode inside page
    .text-muted {
      color: #6b7280 !important;
    }

    .text-primary {
      color: #2563eb !important;
    }

    a {
      color: #2563eb !important;
    }
  }

  &__block {
    // Block spacing handled by BlockRenderer
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
}
</style>
