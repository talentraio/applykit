<template>
  <UPageCard class="vacancy-item-overview-content-generation-match-score">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ $t('generation.matchScore.title') }}
      </h3>

      <p class="text-sm text-muted">
        {{ $t('generation.matchScore.description') }}
      </p>
    </template>

    <div class="space-y-4">
      <!-- Before Score -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('generation.matchScore.before', { score: scoreBefore }) }}
        </span>
        <UProgress :model-value="scoreBefore" color="neutral" size="md" class="w-32" />
      </div>

      <!-- After Score -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('generation.matchScore.after', { score: scoreAfter }) }}
        </span>
        <UProgress :model-value="scoreAfter" :color="scoreColor" size="md" class="w-32" />
      </div>

      <!-- Improvement -->
      <div class="mt-4 flex items-center justify-between">
        <div
          v-if="improvement > 0"
          class="flex items-center justify-between rounded-lg bg-primary/10 p-3"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-trending-up" class="h-5 w-5 text-primary" />
            <span class="text-sm font-semibold text-primary">
              {{ $t('generation.matchScore.improvement', { points: improvement }) }}
            </span>
          </div>
        </div>

        <VacancyItemScoreDetailsButton :vacancy-id="vacancyId" :generation-id="generationId" />
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * Match Score Display Component
 *
 * Shows before/after match scores with visual progress bars.
 * Highlights improvement when applicable.
 *
 * Related: T112 (US5)
 */

defineOptions({ name: 'VacancyItemOverviewContentGenerationMatchScore' });

const props = defineProps<{
  vacancyId: string;
  generationId: string;
  /**
   * Match score before tailoring (0-100)
   */
  scoreBefore: number;
  /**
   * Match score after tailoring (0-100)
   */
  scoreAfter: number;
}>();

// Computed improvement
const improvement = computed(() => props.scoreAfter - props.scoreBefore);

// Color based on after score
const scoreColor = computed(() => {
  if (props.scoreAfter >= 80) return 'success';
  if (props.scoreAfter >= 60) return 'primary';
  if (props.scoreAfter >= 40) return 'warning';
  return 'error';
});
</script>

<style lang="scss">
.vacancy-item-overview-content-generation-match-score {
  // Component-specific styling if needed
}
</style>
