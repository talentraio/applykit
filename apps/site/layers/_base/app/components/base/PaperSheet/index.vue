<template>
  <div ref="containerRef" class="base-paper-sheet" :style="containerStyle">
    <div
      class="base-paper-sheet__sheet"
      :class="{ 'base-paper-sheet__sheet--flat': !elevated }"
      :style="paperStyle"
    >
      <div class="base-paper-sheet__content" :style="contentStyle">
        <BasePaperSheetSkeleton v-if="loading" />
        <slot v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BasePaperSheetSkeleton from '@site/base/app/components/base/PaperSheet/Skeleton.vue';
import { A4_HEIGHT_PX, A4_WIDTH_PX, MM_TO_PX } from '@site/base/app/constants/paper';

defineOptions({ name: 'BasePaperSheet' });

const props = withDefaults(
  defineProps<{
    marginXMm?: number;
    marginYMm?: number;
    fontSize?: number;
    lineHeight?: number;
    minScale?: number;
    maxScale?: number;
    elevated?: boolean;
    loading?: boolean;
  }>(),
  {
    marginXMm: 20,
    marginYMm: 20,
    fontSize: 12,
    lineHeight: 1.2,
    minScale: 0.25,
    maxScale: 1,
    elevated: true,
    loading: false
  }
);

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);

useResizeObserver(containerRef, entries => {
  const entry = entries[0];
  containerWidth.value = entry?.contentRect.width ?? 0;
});

const scale = computed(() => {
  if (containerWidth.value <= 0) return props.maxScale;

  const calculatedScale = containerWidth.value / A4_WIDTH_PX;
  return Math.max(props.minScale, Math.min(calculatedScale, props.maxScale));
});

const marginXPx = computed(() => props.marginXMm * MM_TO_PX);
const marginYPx = computed(() => props.marginYMm * MM_TO_PX);
const isFixedScale = computed(() => props.minScale === props.maxScale);

const containerStyle = computed(() => ({
  width: isFixedScale.value ? `${A4_WIDTH_PX}px` : '100%',
  height: `${A4_HEIGHT_PX * scale.value}px`
}));

const paperStyle = computed(() => ({
  width: `${A4_WIDTH_PX}px`,
  height: `${A4_HEIGHT_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left'
}));

const contentStyle = computed(() => ({
  paddingTop: `${marginYPx.value}px`,
  paddingBottom: `${marginYPx.value}px`,
  paddingLeft: `${marginXPx.value}px`,
  paddingRight: `${marginXPx.value}px`,
  fontSize: `${props.fontSize}pt`,
  lineHeight: props.lineHeight
}));
</script>

<style lang="scss">
.base-paper-sheet {
  position: relative;

  &__sheet {
    background: white;
    color: #1f2937;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 10%),
      0 2px 4px -1px rgb(0 0 0 / 6%);
    border: 1px solid #e5e7eb;
    box-sizing: border-box;
    margin-inline: auto;
    flex: 0 0 auto;
  }

  &__sheet--flat {
    box-shadow: none;
    border: none;
  }

  &__content {
    color: #1f2937;
    box-sizing: border-box;
  }
}
</style>
