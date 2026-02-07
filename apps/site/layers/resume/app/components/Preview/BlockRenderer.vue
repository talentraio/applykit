<template>
  <component :is="blockComponent" v-if="blockComponent" :block="block" :photo-url="photoUrl" />
</template>

<script setup lang="ts">
/**
 * Block Renderer Component
 *
 * Renders individual resume blocks based on type (ATS or Human).
 * Delegates to appropriate view component for each block kind.
 *
 * Related: T025 (US2)
 */

import type { BlockModel, PreviewType } from '../../types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import AtsBlockRenderer from './AtsView/BlockRenderer.vue';
import HumanBlockRenderer from './HumanView/BlockRenderer.vue';

defineOptions({ name: 'ResumePreviewBlockRenderer' });

const props = defineProps<{
  block: BlockModel;
  type: PreviewType;
  photoUrl?: string;
}>();

const blockComponent = computed(() => {
  return props.type === EXPORT_FORMAT_MAP.ATS ? AtsBlockRenderer : HumanBlockRenderer;
});
</script>
