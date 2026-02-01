<template>
  <div v-if="summary" class="resume-preview-summary">
    <h3 class="mb-3 text-lg font-semibold">Summary</h3>
    <p class="whitespace-pre-line text-muted">
      {{ summary }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Summary Section
 *
 * Displays professional summary/objective.
 */

defineOptions({ name: 'ResumePreviewSectionSummary' });

defineProps<{
  summary?: string;
}>();
</script>
