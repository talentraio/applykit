<template>
  <div class="vacancy-lifetime-indicator">
    <!-- Expired State -->
    <UAlert
      v-if="isExpired"
      color="error"
      variant="soft"
      icon="i-lucide-clock-alert"
      :title="$t('generation.lifetime.expired')"
    />

    <!-- Active State -->
    <div
      v-else
      class="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <UIcon :name="iconName" :class="iconClass" class="h-5 w-5" />
      <div class="flex-1">
        <p class="text-sm font-medium">
          {{ $t('generation.lifetime.expiresIn', { days: daysRemaining }) }}
        </p>
        <p class="text-xs text-muted">
          {{ $t('generation.lifetime.expires', { date: formattedExpirationDate }) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Lifetime Indicator Component
 *
 * Shows days until generation expiration with visual indicator.
 * Displays warning states as expiration approaches.
 *
 * Related: T113 (US5)
 */

import type { Generation } from '@int/schema';
import { getDaysUntilExpiration } from '@int/schema';

defineOptions({ name: 'VacancyLifetimeIndicator' });

const props = defineProps<Props>();

type Props = {
  /**
   * Generation object with expiration date
   */
  generation: Generation;
};

const { d } = useI18n();

// Computed days remaining
const daysRemaining = computed(() => getDaysUntilExpiration(props.generation));

// Check if expired
const isExpired = computed(() => daysRemaining.value === 0);

// Formatted expiration date
const formattedExpirationDate = computed(() => {
  const date = new Date(props.generation.expiresAt);
  return d(date, 'short');
});

// Icon and color based on days remaining
const iconName = computed(() => {
  if (daysRemaining.value <= 7) return 'i-lucide-clock-alert';
  if (daysRemaining.value <= 30) return 'i-lucide-clock';
  return 'i-lucide-calendar-check';
});

const iconClass = computed(() => {
  if (daysRemaining.value <= 7) return 'text-error';
  if (daysRemaining.value <= 30) return 'text-warning';
  return 'text-success';
});
</script>

<style lang="scss">
.vacancy-lifetime-indicator {
  // Component-specific styling if needed
}
</style>
