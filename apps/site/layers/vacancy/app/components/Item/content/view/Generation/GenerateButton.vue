<template>
  <UButton
    class="vacancy-generate-button"
    :loading="loading"
    :disabled="disabled || loading"
    icon="i-lucide-sparkles"
    size="lg"
    @click="handleGenerate"
  >
    {{ loading ? $t('generation.inProgress') : $t('generation.button') }}
  </UButton>
</template>

<script setup lang="ts">
/**
 * Generate Button Component
 *
 * Triggers resume generation for a vacancy with loading state.
 * Emits generate event to parent component.
 *
 * Related: T111 (US5)
 */

defineOptions({ name: 'VacancyItemContentViewGenerationGenerateButton' });

defineProps<{
  /**
   * Loading state (generation in progress)
   */
  loading?: boolean;

  /**
   * Disabled state (e.g., no resume available)
   */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  generate: [];
}>();

const handleGenerate = () => {
  emit('generate');
};
</script>

<style lang="scss">
.vacancy-generate-button {
  // Component-specific styling if needed
}
</style>
