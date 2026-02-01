<template>
  <div ref="containerRef" class="paper-sheet-container">
    <div class="paper-sheet" :style="paperStyle">
      <div ref="contentRef" class="paper-sheet__content" :style="contentPaddingStyle">
        <slot />
      </div>

      <!-- Page break indicators -->
      <template v-if="showPageBreaks">
        <div
          v-for="breakIndex in pageBreakCount"
          :key="breakIndex"
          class="paper-sheet__page-break"
          :style="pageBreakStyle(breakIndex)"
        >
          <span class="paper-sheet__page-number">
            {{ breakIndex }} / {{ pageBreakCount + 1 }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PaperSheet Component
 *
 * Renders content in A4-like paper sheets with:
 * - White background (theme-independent)
 * - A4 width proportions (scaled to fit container)
 * - Visual page break indicators when content exceeds one page
 */

defineOptions({ name: 'VacancyResumePaperSheet' });

const props = withDefaults(
  defineProps<{
    /**
     * Padding inside the paper (in mm at 96dpi scale)
     * @default 15
     */
    padding?: number;
    /**
     * Show page break indicators
     * @default true
     */
    showPageBreaks?: boolean;
  }>(),
  {
    padding: 15,
    showPageBreaks: true
  }
);

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Convert mm to px at 96dpi (standard screen)
const MM_TO_PX = 96 / 25.4; // ≈ 3.78

// Paper dimensions in pixels (at 1:1 scale)
const PAPER_WIDTH_PX = A4_WIDTH_MM * MM_TO_PX; // ≈ 794px
const PAPER_HEIGHT_PX = A4_HEIGHT_MM * MM_TO_PX; // ≈ 1123px

const containerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

// Container and content dimensions
const containerWidth = ref(0);
const contentHeight = ref(0);

// Calculate scale factor to fit container
const scale = computed(() => {
  if (!containerWidth.value) return 1;

  // Scale to fit container width
  const scaleX = containerWidth.value / PAPER_WIDTH_PX;

  // Don't scale up beyond 1:1
  return Math.min(scaleX, 1);
});

// Padding in pixels
const paddingPx = computed(() => props.padding * MM_TO_PX);

// Calculate number of page breaks needed
const pageBreakCount = computed(() => {
  if (!contentHeight.value) return 0;

  const usableHeight = PAPER_HEIGHT_PX - paddingPx.value * 2;
  return Math.max(0, Math.ceil(contentHeight.value / usableHeight) - 1);
});

// Paper style (scaled)
const paperStyle = computed(() => ({
  width: `${PAPER_WIDTH_PX}px`,
  minHeight: `${PAPER_HEIGHT_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
  // Adjust margin to account for scale (so container doesn't have extra space)
  marginRight: `-${PAPER_WIDTH_PX * (1 - scale.value)}px`,
  marginBottom: `-${(contentHeight.value + paddingPx.value * 2 - PAPER_HEIGHT_PX) * (1 - scale.value)}px`
}));

// Content padding style
const contentPaddingStyle = computed(() => ({
  padding: `${paddingPx.value}px`
}));

// Page break position style
const pageBreakStyle = (breakIndex: number) => {
  const usableHeight = PAPER_HEIGHT_PX - paddingPx.value * 2;
  const top = paddingPx.value + usableHeight * breakIndex;

  return {
    top: `${top}px`
  };
};

// Measure content height
const measureContent = () => {
  if (contentRef.value) {
    contentHeight.value = contentRef.value.scrollHeight;
  }
};

// Update container width
const updateContainerWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
  }
};

// Setup observers
onMounted(() => {
  updateContainerWidth();
  measureContent();

  if (containerRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
    });
    resizeObserver.observe(containerRef.value);

    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  }

  // Re-measure content after images load, etc.
  nextTick(() => {
    measureContent();
  });
});

// Watch for content changes
watch(
  () => contentRef.value?.scrollHeight,
  () => {
    measureContent();
  }
);
</script>

<style lang="scss">
.paper-sheet-container {
  width: 100%;
  overflow: hidden;
}

.paper-sheet {
  // Always white background, regardless of theme
  background: white;
  color: #1f2937; // gray-800

  // Paper shadow for depth
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 10%),
    0 2px 4px -1px rgb(0 0 0 / 6%);
  border: 1px solid #e5e7eb; // gray-200
  position: relative;

  &__content {
    // Reset any dark mode styles inside paper
    color: #1f2937;

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
    a,
    .text-primary {
      color: #2563eb !important; // blue-600
    }

    // Badges - ensure readable on white
    .rounded-md,
    [class*='UBadge'] {
      background-color: #eff6ff !important; // blue-50
      color: #1e40af !important; // blue-800
      border: none !important;
    }

    // UBadge specific overrides
    [data-slot='badge'] {
      background-color: #eff6ff !important;
      color: #1e40af !important;
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

  &__page-break {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 2px dashed #d1d5db; // gray-300
    pointer-events: none;

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: -6px;
      width: 12px;
      height: 12px;
      background: white;
      border: 2px dashed #d1d5db;
      border-radius: 50%;
    }

    &::before {
      left: 20px;
    }

    &::after {
      right: 20px;
    }
  }

  &__page-number {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 2px 12px;
    font-size: 11px;
    color: #9ca3af; // gray-400
    white-space: nowrap;
  }
}
</style>
