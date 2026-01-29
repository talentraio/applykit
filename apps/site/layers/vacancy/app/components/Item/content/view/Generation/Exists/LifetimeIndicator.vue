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
import { differenceInDays, format, parseISO } from 'date-fns';

defineOptions({ name: 'VacancyItemContentViewGenerationExistsLifetimeIndicator' });

const props = defineProps<{
  /**
   * Generation object with expiration date
   */
  generation: Generation;
}>();

const expirationDate = computed(() => {
  const raw = props.generation.expiresAt;
  if (!raw) return null;
  return typeof raw === 'string' ? parseISO(raw) : raw;
});

// Check if expired (direct date comparison using parsed dates)
const isExpired = computed(() => {
  if (!expirationDate.value) return true;
  const now = new Date();
  return expirationDate.value.getTime() < now.getTime();
});

// Computed days remaining (using parsed expiration date)
const daysRemaining = computed(() => {
  if (!expirationDate.value) return 0;
  const now = new Date();
  const days = differenceInDays(expirationDate.value, now);
  return Math.max(0, days);
});

// Formatted expiration date
const formattedExpirationDate = computed(() => {
  if (!expirationDate.value) return '';
  return format(expirationDate.value, 'dd.MM.yyyy');
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
