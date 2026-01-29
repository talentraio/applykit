<template>
  <div
    class="vacancy-list-row flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    @click="handleClick"
  >
    <!-- Mobile: stacked layout, Desktop: single row -->
    <div class="min-w-0 flex-1">
      <!-- Title (truncated with ellipsis) -->
      <h3 class="truncate font-medium">
        {{ vacancyTitle }}
      </h3>
      <!-- Date - visible only on mobile, below title -->
      <p class="mt-1 text-sm text-muted md:hidden">
        {{ formattedDate }}
      </p>
    </div>

    <!-- Date - visible only on desktop, before buttons -->
    <p class="hidden shrink-0 text-sm text-muted md:block">
      {{ formattedDate }}
    </p>

    <!-- Action buttons -->
    <div class="flex shrink-0 items-center gap-1">
      <UButton
        variant="ghost"
        size="sm"
        color="neutral"
        icon="i-lucide-edit"
        :aria-label="$t('vacancy.card.edit')"
        @click.stop="handleEdit"
      />
      <UButton
        variant="ghost"
        size="sm"
        color="error"
        icon="i-lucide-trash-2"
        :aria-label="$t('vacancy.card.delete')"
        @click.stop="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * VacancyListRow Component
 *
 * Displays a vacancy as a single row in the list view.
 * Desktop: title | date | buttons
 * Mobile: title (date below) | buttons
 *
 * Related: T100 (US4)
 */

import type { Vacancy } from '@int/schema';
import { getVacancyTitle } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'VacancyListRow' });

const props = defineProps<{
  vacancy: Vacancy;
}>();

const emit = defineEmits<{
  click: [vacancy: Vacancy];
  edit: [vacancy: Vacancy];
  delete: [vacancy: Vacancy];
}>();

// Computed title using helper from schema
const vacancyTitle = computed(() => getVacancyTitle(props.vacancy));

// Format the created/updated date
const formattedDate = computed(() => {
  const resolved =
    typeof props.vacancy.updatedAt === 'string'
      ? parseISO(props.vacancy.updatedAt)
      : props.vacancy.updatedAt;
  return format(resolved, 'dd.MM.yyyy');
});

const handleClick = () => {
  emit('click', props.vacancy);
};

const handleEdit = () => {
  emit('edit', props.vacancy);
};

const handleDelete = () => {
  emit('delete', props.vacancy);
};
</script>

<style lang="scss">
.vacancy-list-row {
  // Component-specific styling if needed
}
</style>
