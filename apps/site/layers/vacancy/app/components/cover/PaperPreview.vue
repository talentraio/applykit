<template>
  <div ref="containerRef" class="cover-letter-paper-preview">
    <div class="cover-letter-paper-preview__sheet" :style="paperStyle">
      <div class="cover-letter-paper-preview__page" :style="contentStyle">
        <p v-if="subjectLine" class="cover-letter-paper-preview__subject">
          <strong>Subject:</strong> {{ subjectLine }}
        </p>

        <article
          class="cover-letter-paper-preview__content"
          :style="contentVariables"
          v-html="htmlContent"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';
import { usePageScale } from '@site/resume/app/composables/usePageScale';
import { A4_HEIGHT_PX, A4_WIDTH_PX, MM_TO_PX } from '@site/resume/app/types/preview';

defineOptions({ name: 'VacancyCoverPaperPreview' });

const props = defineProps<{
  htmlContent: string;
  settings: SpacingSettings;
  subjectLine?: string | null;
}>();

const containerRef = ref<HTMLElement | null>(null);
const { scale } = usePageScale(containerRef);

const paperStyle = computed(() => ({
  width: `${A4_WIDTH_PX}px`,
  height: `${A4_HEIGHT_PX}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left'
}));

const contentStyle = computed(() => ({
  paddingLeft: `${props.settings.marginX * MM_TO_PX}px`,
  paddingRight: `${props.settings.marginX * MM_TO_PX}px`,
  paddingTop: `${props.settings.marginY * MM_TO_PX}px`,
  paddingBottom: `${props.settings.marginY * MM_TO_PX}px`,
  fontSize: `${props.settings.fontSize}pt`,
  lineHeight: props.settings.lineHeight
}));

const contentVariables = computed(() => {
  const paragraphSpacing = 0.6 + ((props.settings.blockSpacing - 1) / 8) * 1.2;

  return {
    '--cover-letter-paragraph-gap': `${paragraphSpacing}em`
  };
});
</script>

<style lang="scss">
.cover-letter-paper-preview {
  width: 100%;
  overflow: hidden;

  &__sheet {
    background: white;
    color: #1f2937;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 10%),
      0 2px 4px -1px rgb(0 0 0 / 6%);
    border: 1px solid #e5e7eb;
    box-sizing: border-box;
  }

  &__page {
    box-sizing: border-box;
    color: #1f2937;
  }

  &__subject {
    margin: 0 0 1.1em;
  }

  &__content {
    :deep(p) {
      margin: 0 0 var(--cover-letter-paragraph-gap);
    }

    :deep(p:last-child) {
      margin-bottom: 0;
    }

    :deep(ul),
    :deep(ol) {
      margin: 0 0 var(--cover-letter-paragraph-gap);
      padding-left: 1.25em;
    }

    :deep(li) {
      margin-bottom: 0.3em;
    }

    :deep(h1),
    :deep(h2),
    :deep(h3) {
      margin: 0 0 0.7em;
      font-weight: 600;
      line-height: 1.2;
    }

    :deep(h1) {
      font-size: 1.3em;
    }

    :deep(h2) {
      font-size: 1.2em;
    }

    :deep(h3) {
      font-size: 1.1em;
    }

    :deep(blockquote) {
      margin: 0 0 var(--cover-letter-paragraph-gap);
      padding-left: 0.9em;
      border-left: 2px solid #d1d5db;
      color: #4b5563;
    }

    :deep(code) {
      background: #f3f4f6;
      border-radius: 0.2rem;
      padding: 0.05em 0.25em;
      font-size: 0.92em;
    }

    :deep(a) {
      color: #2563eb;
      text-decoration: underline;
    }
  }
}
</style>
