<template>
  <component :is="designComponent" :content="content" />
</template>

<script setup lang="ts">
/**
 * Resume ATS View
 *
 * Entry point for ATS-optimized resume view.
 * Delegates to design variant components.
 *
 * Related: T023 (US2)
 */

import type { ResumeContent } from '@int/schema';
import Design1 from './Design1.vue';

defineOptions({ name: 'ResumePreviewAtsView' });

const props = defineProps<{
  content: ResumeContent;
  /**
   * Design variant to use
   * @default 'design1'
   */
  design?: 'design1';
}>();

// Map design names to components
const designComponents = {
  design1: Design1
} as const;

const designComponent = computed(() => {
  return designComponents[props.design ?? 'design1'];
});
</script>
