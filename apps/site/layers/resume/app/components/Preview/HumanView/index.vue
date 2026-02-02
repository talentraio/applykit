<template>
  <component :is="designComponent" :content="content" :photo-url="photoUrl" />
</template>

<script setup lang="ts">
/**
 * Resume Human View
 *
 * Entry point for human-readable resume view.
 * Delegates to design variant components.
 *
 * Related: T024 (US2)
 */

import type { ResumeContent } from '@int/schema';
import Design1 from './Design1.vue';

defineOptions({ name: 'ResumePreviewHumanView' });

const props = defineProps<{
  content: ResumeContent;
  /**
   * Profile photo URL (optional)
   */
  photoUrl?: string;
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
