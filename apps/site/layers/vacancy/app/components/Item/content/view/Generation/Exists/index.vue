<template>
  <div class="vacancy-generation-exists space-y-6">
    <!-- Latest generation exists -->
    <MatchScoreDisplay
      :score-before="generation.matchScoreBefore"
      :score-after="generation.matchScoreAfter"
    />

    <LifetimeIndicator :generation="generation" />

    <div class="flex flex-wrap gap-3">
      <GenerateButton :loading="isGenerating" @generate="handleGenerate" />
      <UButton
        variant="outline"
        icon="i-lucide-file-text"
        :to="`/vacancies/${vacancyId}/ats`"
        :disabled="isGenerating"
      >
        {{ $t('vacancy.detail.actions.viewAts') }}
      </UButton>
      <UButton
        variant="outline"
        icon="i-lucide-layout-template"
        :to="`/vacancies/${vacancyId}/human`"
        :disabled="isGenerating"
      >
        {{ $t('vacancy.detail.actions.viewHuman') }}
      </UButton>
    </div>

    <VacancyExportButtons
      :vacancy-id="vacancyId"
      :generation-id="generation.id"
      :disabled="isGenerating"
    />
  </div>
</template>

<script setup lang="ts">
import type { Generation } from '@int/schema';
import GenerateButton from '../GenerateButton.vue';
/**
 * Generation Exists View
 *
 * Displays generation results when a generation exists.
 * Shows match score, lifetime indicator, regenerate action, and export buttons.
 *
 * Related: T112, T113 (US5)
 */
import LifetimeIndicator from './LifetimeIndicator.vue';
import MatchScoreDisplay from './MatchScoreDisplay.vue';

defineOptions({ name: 'VacancyItemContentViewGenerationExists' });

defineProps<{
  /**
   * Vacancy ID
   */
  vacancyId: string;

  /**
   * Generation data
   */
  generation: Generation;

  /**
   * Loading state for generation action
   */
  isGenerating: boolean;
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
.vacancy-generation-exists {
  // Component-specific styling if needed
}
</style>
