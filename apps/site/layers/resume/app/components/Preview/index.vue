<template>
  <div ref="containerRef" class="resume-preview" :data-ready="isReady ? 'true' : 'false'">
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

import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  SpacingSettings
} from '@int/schema';
import type { PreviewType } from '../../types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';
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
     * Preview type: ATS or Human
     * @default EXPORT_FORMAT_MAP.ATS
     */
    type?: PreviewType;
    /**
     * Format settings (spacing + localization per format type)
     */
    settings?: ResumeFormatSettingsAts | ResumeFormatSettingsHuman;
    /**
     * Profile photo URL for human view
     */
    photoUrl?: string;
  }>(),
  {
    type: EXPORT_FORMAT_MAP.ATS,
    settings: undefined
  }
);

const defaults = useFormatSettingsDefaults();
const defaultSpacing = computed<SpacingSettings>(() =>
  props.type === EXPORT_FORMAT_MAP.HUMAN ? defaults.human.spacing : defaults.ats.spacing
);

// Extract spacing from format settings, with defaults
const settings = computed<SpacingSettings>(() => ({
  ...defaultSpacing.value,
  ...props.settings?.spacing
}));

// Convert padding to pixels (separate X and Y)
const paddingXPx = computed(() => settings.value.marginX * MM_TO_PX);
const paddingYPx = computed(() => settings.value.marginY * MM_TO_PX);

// Refs
const containerRef = ref<HTMLElement | null>(null);
const measurerRef = ref<HTMLElement | null>(null);

// Convert content to blocks
const contentRef = computed(() => props.content);
const { blocks } = useResumeBlocks(contentRef);

// Measure block heights (re-measure when fontSize, lineHeight, or blockSpacing change)
const { measuredBlocks, isComplete } = useBlockMeasurer(blocks, measurerRef, {
  measurementKeys: [
    computed(() => settings.value.fontSize),
    computed(() => settings.value.lineHeight),
    computed(() => settings.value.marginX), // Content width changes with marginX
    computed(() => settings.value.blockSpacing) // Block spacing affects heights
  ]
});

// Paginate blocks into pages (reactive to marginY and blockSpacing changes)
const { pages } = usePaginator(measuredBlocks, {
  paddingYMm: computed(() => settings.value.marginY),
  blockSpacingPx: computed(() => settings.value.blockSpacing * 2)
});

const isReady = computed(() => isComplete.value && pages.value.length > 0);

// Calculate scale based on container width
const { scale } = usePageScale(containerRef);

// Measurer content style (same width as A4 page inner width)
const measurerContentStyle = computed(() => ({
  width: `${A4_WIDTH_PX - paddingXPx.value * 2}px`,
  fontSize: `${settings.value.fontSize}pt`,
  lineHeight: settings.value.lineHeight,
  '--line-height': settings.value.lineHeight,
  '--block-spacing': `${settings.value.blockSpacing * 2}px`
}));

// Container for all pages
const pagesContainerStyle = computed(() => ({
  '--page-scale': scale.value,
  '--page-width': `${A4_WIDTH_PX}px`,
  '--page-height': `${A4_HEIGHT_PX}px`,
  '--page-pad-x': `${paddingXPx.value}px`,
  '--page-pad-y': `${paddingYPx.value}px`,
  '--font-size': `${settings.value.fontSize}pt`,
  '--line-height': settings.value.lineHeight,
  '--block-spacing': `${settings.value.blockSpacing * 2}px`
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

// Page content padding style (separate X and Y)
const pageContentStyle = computed(() => ({
  padding: `${paddingYPx.value}px ${paddingXPx.value}px`,
  fontSize: `${settings.value.fontSize}pt`,
  lineHeight: settings.value.lineHeight,
  '--line-height': settings.value.lineHeight,
  '--block-spacing': `${settings.value.blockSpacing * 2}px`
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

    // Same text scaling as page content for accurate measurement
    // Must match __page-content exactly for correct pagination
    .text-2xl {
      font-size: 1.5em !important;
      line-height: inherit !important;
    }

    .text-xl {
      font-size: 1.25em !important;
      line-height: inherit !important;
    }

    .text-lg {
      font-size: 1.125em !important;
      line-height: inherit !important;
    }

    .text-base {
      font-size: 1em !important;
      line-height: inherit !important;
    }

    .text-sm {
      font-size: 0.875em !important;
      line-height: inherit !important;
    }

    .text-xs {
      font-size: 0.75em !important;
      line-height: inherit !important;
    }

    .leading-relaxed {
      line-height: calc(var(--line-height, 1.2) * 1.3) !important;
    }

    .leading-normal {
      line-height: var(--line-height, 1.2) !important;
    }

    .leading-tight {
      line-height: calc(var(--line-height, 1.2) * 0.9) !important;
    }
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
    height: 100%; // Fill the A4 page so bottom padding aligns to page bottom

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

    // Scale Tailwind text classes relative to base font size
    // Base font size is set via inline style (e.g., 12pt)
    // These scale proportionally when base changes
    // Also reset line-height to inherit from parent (Tailwind text classes include line-height)
    .text-2xl {
      font-size: 1.5em !important;
      line-height: inherit !important;
    }

    .text-xl {
      font-size: 1.25em !important;
      line-height: inherit !important;
    }

    .text-lg {
      font-size: 1.125em !important;
      line-height: inherit !important;
    }

    .text-base {
      font-size: 1em !important;
      line-height: inherit !important;
    }

    .text-sm {
      font-size: 0.875em !important;
      line-height: inherit !important;
    }

    .text-xs {
      font-size: 0.75em !important;
      line-height: inherit !important;
    }

    // Scale leading classes relative to base line height
    .leading-relaxed {
      line-height: calc(var(--line-height, 1.2) * 1.3) !important;
    }

    .leading-normal {
      line-height: var(--line-height, 1.2) !important;
    }

    .leading-tight {
      line-height: calc(var(--line-height, 1.2) * 0.9) !important;
    }
  }

  &__block {
    // Block spacing using CSS variable
    &:not(:first-child) {
      margin-top: var(--block-spacing, 10px);
    }
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
