<template>
  <div class="vacancy-generation-empty space-y-4">
    <!-- No generation yet -->
    <p class="text-sm text-muted">
      {{ $t('vacancy.detail.generateHint') }}
    </p>

    <GenerateButton :loading="isGenerating" :disabled="!hasResume" @generate="handleGenerate" />

    <p v-if="!hasResume" class="text-xs text-error">
      {{ $t('generation.error.noResume') }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Generation Empty View
 *
 * Displays initial state when no generation exists yet.
 * Shows hint message and generate button.
 *
 * Related: T112, T113 (US5)
 */

import GenerateButton from './GenerateButton.vue';

defineOptions({ name: 'VacancyItemContentViewGenerationEmpty' });

defineProps<{
  /**
   * Loading state for generation action
   */
  isGenerating: boolean;

  /**
   * Whether user has at least one resume
   */
  hasResume: boolean;
}>();
const emit = defineEmits<{
  /**
   * Emitted when generate button is clicked
   */
  generate: [];
}>();

// Event handler
const handleGenerate = () => {
  emit('generate');
};
</script>

<style lang="scss">
.vacancy-generation-empty {
  // Component-specific styling if needed
}
</style>
