<template>
  <UPageCard
    class="vacancy-card cursor-pointer transition-shadow hover:shadow-lg"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <h3 class="font-semibold leading-tight">
            {{ vacancyTitle }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ formattedDate }}
          </p>
        </div>
      </div>
    </template>

    <div class="vacancy-card__content space-y-3">
      <!-- Description Preview -->
      <p class="line-clamp-3 text-sm text-muted">
        {{ vacancy.description }}
      </p>

      <!-- Metadata -->
      <div class="flex flex-wrap gap-2">
        <UBadge v-if="vacancy.url" color="primary" variant="soft" size="sm">
          <UIcon name="i-lucide-link" class="mr-1 h-3 w-3" />
          Link
        </UBadge>
        <UBadge v-if="vacancy.notes" color="neutral" variant="soft" size="sm">
          <UIcon name="i-lucide-sticky-note" class="mr-1 h-3 w-3" />
          Notes
        </UBadge>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <UButton
          variant="ghost"
          size="sm"
          color="neutral"
          icon="i-lucide-edit"
          @click.stop="handleEdit"
        >
          {{ $t('vacancy.card.edit') }}
        </UButton>
        <UButton
          variant="ghost"
          size="sm"
          color="error"
          icon="i-lucide-trash-2"
          @click.stop="handleDelete"
        >
          {{ $t('vacancy.card.delete') }}
        </UButton>
      </div>
    </template>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * VacancyCard Component
 *
 * Displays a vacancy in a card format with "Company (Position)" title.
 * Shows preview of description and action buttons.
 *
 * Related: T100 (US4)
 */

import type { Vacancy } from '@int/schema';
import { getVacancyTitle } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'VacancyCard' });

const props = defineProps<{
  vacancy: Vacancy;
}>();

const emit = defineEmits<{
  click: [vacancy: Vacancy];
  edit: [vacancy: Vacancy];
  delete: [vacancy: Vacancy];
}>();

const { t } = useI18n();

// Computed title using helper from schema
const vacancyTitle = computed(() => getVacancyTitle(props.vacancy));

// Format the created/updated date
const formattedDate = computed(() => {
  const resolved =
    typeof props.vacancy.updatedAt === 'string'
      ? parseISO(props.vacancy.updatedAt)
      : props.vacancy.updatedAt;
  return t('vacancy.card.updatedAt', { date: format(resolved, 'dd.MM.yyyy') });
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
.vacancy-card {
  &__content {
    // Content styling if needed
  }
}
</style>
