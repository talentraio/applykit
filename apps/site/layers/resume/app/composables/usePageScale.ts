/**
 * usePageScale Composable
 *
 * Calculates zoom scale based on container width for A4 preview.
 * Uses VueUse ResizeObserver to track container dimensions.
 *
 * Related: T020 (US2)
 */

import { A4_WIDTH_PX } from '../types/preview';

/**
 * Scale options
 */
export type PageScaleOptions = {
  /** Minimum scale factor (default: 0.25) */
  minScale?: number;
  /** Maximum scale factor (default: 1) */
  maxScale?: number;
  /** Custom page width in px (default: A4_WIDTH_PX) */
  pageWidthPx?: number;
};

/**
 * Calculate zoom scale for A4 preview based on container width
 *
 * @param containerRef - Ref to container element
 * @param options - Scale options
 * @returns Scale factor and container dimensions
 */
export function usePageScale(
  containerRef: Ref<HTMLElement | null>,
  options: PageScaleOptions = {}
) {
  const { minScale = 0.25, maxScale = 1, pageWidthPx = A4_WIDTH_PX } = options;

  const containerWidth = ref(0);
  const containerHeight = ref(0);

  // Use VueUse ResizeObserver for efficient dimension tracking
  useResizeObserver(containerRef, entries => {
    const entry = entries[0];
    if (entry) {
      containerWidth.value = entry.contentRect.width;
      containerHeight.value = entry.contentRect.height;
    }
  });

  // Calculate scale: fit page to container width, capped at 1:1
  const scale = computed(() => {
    if (containerWidth.value <= 0) return maxScale;

    const calculatedScale = containerWidth.value / pageWidthPx;
    return Math.max(minScale, Math.min(calculatedScale, maxScale));
  });

  // Scaled page dimensions
  const scaledPageWidth = computed(() => pageWidthPx * scale.value);
  const scaledPageHeight = computed(() => {
    // A4 aspect ratio
    const aspectRatio = 297 / 210;
    return scaledPageWidth.value * aspectRatio;
  });

  // CSS custom properties for styling
  const cssVars = computed(() => ({
    '--page-scale': scale.value,
    '--page-width': `${pageWidthPx}px`,
    '--page-width-scaled': `${scaledPageWidth.value}px`,
    '--page-height-scaled': `${scaledPageHeight.value}px`,
    '--container-width': `${containerWidth.value}px`
  }));

  return {
    scale,
    containerWidth: computed(() => containerWidth.value),
    containerHeight: computed(() => containerHeight.value),
    scaledPageWidth,
    scaledPageHeight,
    cssVars
  };
}
