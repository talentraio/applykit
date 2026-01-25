<template>
  <UPageCard class="vacancy-match-score-display">
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
        <UProgress :value="scoreBefore" color="neutral" size="md" class="w-32" />
      </div>

      <!-- After Score -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('generation.matchScore.after', { score: scoreAfter }) }}
        </span>
        <UProgress :value="scoreAfter" :color="scoreColor" size="md" class="w-32" />
      </div>

      <!-- Improvement -->
      <div v-if="improvement > 0" class="mt-4 rounded-lg bg-primary/10 p-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-trending-up" class="h-5 w-5 text-primary" />
          <span class="text-sm font-semibold text-primary">
            {{ $t('generation.matchScore.improvement', { points: improvement }) }}
          </span>
        </div>
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

defineOptions({ name: 'VacancyMatchScoreDisplay' });

const props = defineProps<Props>();

type Props = {
  /**
   * Match score before tailoring (0-100)
   */
  scoreBefore: number;

  /**
   * Match score after tailoring (0-100)
   */
  scoreAfter: number;
};

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
.vacancy-match-score-display {
  // Component-specific styling if needed
}
</style>
