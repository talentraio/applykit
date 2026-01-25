<template>
  <UPageSection :title="title" :description="description" class="ui-form-section">
    <slot />
  </UPageSection>
</template>

<script setup lang="ts">
/**
 * FormSection Component
 *
 * Standardized form section using Nuxt UI Pro's UPageSection
 * Groups related form fields with heading and description
 *
 * Per docs/design/mvp.md - consistent section patterns
 */

defineOptions({ name: 'UiFormSection' });

defineProps<{
  title: string;
  description?: string;
}>();
</script>
