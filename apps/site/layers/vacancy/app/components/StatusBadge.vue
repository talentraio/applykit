<template>
  <UDropdownMenu v-if="isInteractive" :items="dropdownItems">
    <UBadge
      :color="currentColor"
      variant="soft"
      size="md"
      class="cursor-pointer transition-opacity hover:opacity-80"
      :class="{ 'opacity-50': loading }"
    >
      <UIcon v-if="loading" name="i-lucide-loader-2" class="mr-1 h-3 w-3 animate-spin" />
      {{ currentLabel }}
      <UIcon v-if="!loading" name="i-lucide-chevron-down" class="ml-1 h-3 w-3" />
    </UBadge>
  </UDropdownMenu>

  <!-- Non-interactive badge (disabled or no options) -->
  <UBadge v-else :color="currentColor" variant="soft" size="md" :class="{ 'opacity-50': loading }">
    <UIcon v-if="loading" name="i-lucide-loader-2" class="mr-1 h-3 w-3 animate-spin" />
    {{ currentLabel }}
  </UBadge>
</template>

<script setup lang="ts">
/**
 * Vacancy Status Badge Component
 *
 * Interactive status badge with dropdown for manual status changes.
 * Shows current status with appropriate color and allows transitioning
 * to contextually valid statuses based on generation history.
 *
 * Related: T029-T033 (US3)
 */

import type { DropdownMenuItem } from '#ui/types';
import type { VacancyStatus } from '@int/schema';
import { getAvailableStatuses } from '@site/vacancy/app/utils/availableStatuses';
import { getStatusColor, STATUS_COLORS } from '@site/vacancy/app/utils/statusColors';

defineOptions({ name: 'VacancyStatusBadge' });

const props = defineProps<{
  /**
   * Current vacancy status
   */
  status: VacancyStatus;

  /**
   * Whether the vacancy has any generation (affects valid transitions)
   */
  hasGeneration: boolean;

  /**
   * Whether status change is in progress
   */
  loading?: boolean;

  /**
   * Disable status changes (read-only mode)
   */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  /**
   * Emitted when user selects a new status
   */
  change: [status: VacancyStatus];
}>();

const { t } = useI18n();

// --- Computed ---

/**
 * Current status color for badge
 */
const currentColor = computed(() => getStatusColor(props.status));

/**
 * Current status label
 */
const currentLabel = computed(() => t(`vacancy.status.${props.status}`));

/**
 * Available status options for dropdown
 */
const availableStatuses = computed(() => getAvailableStatuses(props.status, props.hasGeneration));

/**
 * Dropdown menu items
 */
const dropdownItems = computed<DropdownMenuItem[][]>(() => {
  if (props.disabled || props.loading) {
    return [];
  }

  const items: DropdownMenuItem[] = availableStatuses.value.map(status => ({
    label: t(`vacancy.status.${status}`),
    icon: getStatusIcon(status),
    color: STATUS_COLORS[status],
    onSelect: () => handleStatusSelect(status)
  }));

  return items.length > 0 ? [items] : [];
});

/**
 * Whether dropdown should be interactive
 */
const isInteractive = computed(
  () => !props.disabled && !props.loading && availableStatuses.value.length > 0
);

// --- Helpers ---

/**
 * Get icon for status
 */
function getStatusIcon(status: VacancyStatus): string {
  const icons: Record<VacancyStatus, string> = {
    created: 'i-lucide-circle-plus',
    generated: 'i-lucide-sparkles',
    screening: 'i-lucide-search',
    rejected: 'i-lucide-x-circle',
    interview: 'i-lucide-calendar-check',
    offer: 'i-lucide-trophy'
  };
  return icons[status];
}

// --- Event Handlers ---

/**
 * Handle status selection from dropdown
 */
function handleStatusSelect(status: VacancyStatus) {
  if (!props.disabled && !props.loading) {
    emit('change', status);
  }
}
</script>
