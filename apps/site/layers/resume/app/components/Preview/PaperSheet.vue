<template>
  <BasePaperSheet
    class="resume-preview-paper-sheet"
    :margin-x-mm="paddingMm"
    :margin-y-mm="paddingMm"
    :font-size="fontSize"
    :line-height="lineHeight"
  >
    <slot />
  </BasePaperSheet>
</template>

<script setup lang="ts">
import BasePaperSheet from '@site/base/app/components/base/PaperSheet/index.vue';

defineOptions({ name: 'ResumePreviewPaperSheet' });

withDefaults(
  defineProps<{
    paddingMm?: number;
    fontSize?: number;
    lineHeight?: number;
  }>(),
  {
    paddingMm: 20,
    fontSize: 12,
    lineHeight: 1.2
  }
);
</script>

<style lang="scss">
.resume-preview-paper-sheet {
  .base-paper-sheet__content {
    .text-muted {
      color: #6b7280 !important;
    }

    .text-primary {
      color: #2563eb !important;
    }

    .text-foreground {
      color: #1f2937 !important;
    }

    .border-neutral-200,
    .border-neutral-800,
    [class*='border-neutral'] {
      border-color: #e5e7eb !important;
    }

    a {
      color: #2563eb !important;
    }

    [data-slot='badge'] {
      background-color: #eff6ff !important;
      color: #1e40af !important;
    }

    .bg-neutral-100,
    .bg-neutral-800,
    [class*='bg-neutral'] {
      background-color: #f9fafb !important;
    }

    [class*='border-primary'] {
      border-color: #93c5fd !important;
    }
  }
}
</style>
