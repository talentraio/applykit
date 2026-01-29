<template>
  <UPageCard class="vacancy-generation-section">
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ $t('vacancy.detail.actions.generate') }}
      </h2>
    </template>

    <div v-if="generationPending" class="flex items-center justify-center py-8">
      <!-- Loading state -->
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <GenerationExists
      v-else-if="latestGeneration"
      :vacancy-id="vacancyId"
      :generation="latestGeneration"
      :is-generating="isGenerating"
      @generate="handleGenerate"
    />

    <GenerationEmpty
      v-else
      :is-generating="isGenerating"
      :has-resume="hasResume"
      @generate="handleGenerate"
    />

    <UAlert
      v-if="generationError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('generation.error.generationFailed')"
      :description="generationError"
      class="mt-4"
    >
      <!-- Generation Error -->
    </UAlert>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * Vacancy Generation Section
 *
 * Displays generation status, actions, and results.
 * Shows match score, lifetime indicator, and export buttons when generation exists.
 *
 * Related: T112, T113 (US5)
 */

import type { Generation } from '@int/schema';
import GenerationEmpty from './Empty.vue';
import GenerationExists from './Exists/index.vue';

defineOptions({ name: 'VacancyItemContentViewGeneration' });

defineProps<{
  /**
   * Vacancy ID
   */
  vacancyId: string;

  /**
   * Latest generation data (null if no generation exists)
   */
  latestGeneration: Generation | null;

  /**
   * Loading state for fetching generation
   */
  generationPending: boolean;

  /**
   * Loading state for generation action
   */
  isGenerating: boolean;

  /**
   * Whether user has at least one resume
   */
  hasResume: boolean;

  /**
   * Error message from generation attempt
   */
  generationError: string | null;
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
.vacancy-generation-section {
  // Component-specific styling if needed
}
</style>
