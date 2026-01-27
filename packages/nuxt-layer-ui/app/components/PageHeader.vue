<template>
  <UPageHeader
    :title="title"
    :description="description"
    :headline="headline"
    :links="links"
    class="ui-page-header"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template v-if="$slots.actions" #links>
      <slot name="actions" />
    </template>
  </UPageHeader>
</template>

<script setup lang="ts">
/**
 * PageHeader Component
 *
 * Standardized page header using Nuxt UI Pro's UPageHeader
 * Provides consistent heading hierarchy and spacing
 *
 * Per docs/design/mvp.md - reuses SaaS template navigation/app shell patterns
 */

import type { ButtonProps } from '#ui/types';

defineOptions({ name: 'UiPageHeader' });

defineProps<{
  title: string;
  description?: string;
  headline?: string;
  links?: ButtonProps[];
}>();
</script>
