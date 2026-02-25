<template>
  <div class="base-paper-sheet-skeleton" aria-hidden="true">
    <div class="base-paper-sheet-skeleton__loading-row">
      <span class="base-paper-sheet-skeleton__loading-label">Loading</span>
      <UProgress
        class="base-paper-sheet-skeleton__loading-progress"
        size="2xl"
        color="neutral"
        animation="carousel"
        :ui="progressUi"
      />
    </div>

    <div
      v-for="(paragraph, paragraphIndex) in skeletonParagraphs"
      :key="`paragraph-${paragraphIndex}`"
      class="base-paper-sheet-skeleton__paragraph"
    >
      <USkeleton
        v-for="(line, lineIndex) in paragraph"
        :key="`line-${paragraphIndex}-${lineIndex}`"
        class="base-paper-sheet-skeleton__line"
        :class="`base-paper-sheet-skeleton__line--${line}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'BasePaperSheetSkeleton' });

type LineWidth = 'full' | 'wide' | 'medium' | 'narrow' | 'short';

const progressUi = {
  base: 'h-4 bg-[#d6dde8]',
  indicator: 'bg-[#c3ccd9]'
} as const;

const paragraphPattern: readonly LineWidth[][] = [
  ['wide', 'full', 'full', 'medium'],
  ['full', 'full', 'wide', 'narrow'],
  ['wide', 'full', 'full', 'medium'],
  ['full', 'full', 'wide', 'short'],
  ['wide', 'full', 'medium']
] as const;

const skeletonParagraphs: LineWidth[][] = Array.from({ length: 11 }, (_, index) => {
  const template = paragraphPattern[index % paragraphPattern.length] ?? paragraphPattern[0];

  if (!template) {
    return ['full'];
  }

  return [...template];
});
</script>

<style lang="scss">
.base-paper-sheet-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;

  &__loading-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  &__loading-label {
    color: #c5ccd8;
    font-size: 30px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  &__loading-progress {
    flex: 1;
    min-width: 0;
  }

  &__paragraph {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__line {
    height: 0.8em;
    border-radius: 0.25rem;
    background-color: #edf1f6;
  }

  &__line--full {
    width: 100%;
  }

  &__line--wide {
    width: 92%;
  }

  &__line--medium {
    width: 78%;
  }

  &__line--narrow {
    width: 64%;
  }

  &__line--short {
    width: 50%;
  }
}
</style>
