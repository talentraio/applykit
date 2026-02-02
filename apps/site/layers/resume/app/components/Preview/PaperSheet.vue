<template>
  <div ref="containerRef" class="paper-sheet-container" :style="containerStyle">
    <div class="paper-sheet" :style="paperStyle">
      <div class="paper-sheet__content" :style="contentStyle">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PaperSheet Component
 *
 * A4 paper container with zoom scaling for preview.
 * Uses CSS variables for configurable dimensions.
 *
 * Features:
 * - Fixed A4 dimensions (210mm × 297mm)
 * - Zoom-based scaling to fit container
 * - Configurable padding via settings
 * - White background for print-like appearance
 *
 * Related: T021 (US2)
 */

import { usePageScale } from '../../composables/usePageScale';
import { A4_HEIGHT_PX, A4_WIDTH_PX, MM_TO_PX } from '../../types/preview';

defineOptions({ name: 'ResumePaperSheet' });

const props = withDefaults(
  defineProps<{
    /**
     * Padding inside the paper (in mm)
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
    paddingMm: 20,
    fontSize: 12,
    lineHeight: 1.2
  }
);

const containerRef = ref<HTMLElement | null>(null);

// Use page scale composable for zoom calculation
const { scale, cssVars } = usePageScale(containerRef);

// Convert padding to pixels
const paddingPx = computed(() => props.paddingMm * MM_TO_PX);

// Container style to reserve space for scaled paper
const containerStyle = computed(() => ({
  ...cssVars.value,
  '--page-pad': `${paddingPx.value}px`,
  '--font-size': `${props.fontSize}pt`,
  '--line-height': props.lineHeight,
  width: '100%',
  height: `${A4_HEIGHT_PX * scale.value}px`
}));

// Paper style with scaling
const paperStyle = computed(() => ({
  width: `${A4_WIDTH_PX}px`,
  minHeight: `${A4_HEIGHT_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left'
}));

// Content padding style
const contentStyle = computed(() => ({
  padding: `${paddingPx.value}px`,
  fontSize: `${props.fontSize}pt`,
  lineHeight: props.lineHeight
}));

// Expose container ref for parent measurement
defineExpose({
  containerRef
});
</script>

<style lang="scss">
.paper-sheet-container {
  overflow: hidden;
  position: relative;
}

.paper-sheet {
  // Always white background for print-like appearance
  background: white;
  color: #1f2937; // gray-800

  // Paper shadow for depth
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 10%),
    0 2px 4px -1px rgb(0 0 0 / 6%);
  border: 1px solid #e5e7eb; // gray-200
  position: relative;
  box-sizing: border-box;

  &__content {
    // Reset any dark mode styles inside paper
    color: #1f2937;
    box-sizing: border-box;

    // Override common utility classes for print-like appearance
    .text-muted {
      color: #6b7280 !important; // gray-500
    }

    .text-primary {
      color: #2563eb !important; // blue-600
    }

    .text-foreground {
      color: #1f2937 !important; // gray-800
    }

    // Override borders for light theme
    .border-neutral-200,
    .border-neutral-800,
    [class*='border-neutral'] {
      border-color: #e5e7eb !important; // gray-200
    }

    // Links
    a {
      color: #2563eb !important; // blue-600
    }

    // Badges - ensure readable on white
    [data-slot='badge'] {
      background-color: #eff6ff !important; // blue-50
      color: #1e40af !important; // blue-800
    }

    // Dark backgrounds in content should be light
    .bg-neutral-100,
    .bg-neutral-800,
    [class*='bg-neutral'] {
      background-color: #f9fafb !important; // gray-50
    }

    // Round photo borders
    [class*='border-primary'] {
      border-color: #93c5fd !important; // blue-300
    }
  }
}
</style>
