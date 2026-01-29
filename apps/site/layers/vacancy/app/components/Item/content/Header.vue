<template>
  <div class="vacancy-item-header mb-8">
    <!-- Back Button -->
    <div class="mb-4">
      <UButton variant="ghost" icon="i-lucide-arrow-left" @click="handleBack">
        {{ $t('common.back') }}
      </UButton>
    </div>

    <!-- Title and Actions -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h1 class="text-3xl font-bold">
          {{ vacancyTitle }}
        </h1>
        <p class="mt-2 text-muted">{{ $t('vacancy.detail.updatedAt') }}: {{ formattedDate }}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <UButton variant="outline" icon="i-lucide-edit" @click="handleToggleEdit">
          {{ isEditMode ? $t('common.cancel') : $t('vacancy.detail.actions.edit') }}
        </UButton>
        <UButton variant="outline" color="error" icon="i-lucide-trash-2" @click="handleDelete">
          {{ $t('vacancy.detail.actions.delete') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Vacancy Page Header Component
 *
 * Displays vacancy title, updated date, and action buttons (back, edit, delete).
 *
 * Related: T103 (US4)
 */

import type { Vacancy } from '@int/schema';
import { getVacancyTitle } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'VacancyItemContentHeader' });

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

type Props = {
  /**
   * Vacancy object to display
   */
  vacancy: Vacancy;

  /**
   * Whether page is in edit mode
   */
  isEditMode: boolean;
};

type Emits = {
  /**
   * Emitted when back button is clicked
   */
  back: [];

  /**
   * Emitted when edit/cancel button is clicked
   */
  toggleEdit: [];

  /**
   * Emitted when delete button is clicked
   */
  delete: [];
};

// Computed values
const vacancyTitle = computed(() => getVacancyTitle(props.vacancy));

const formattedDate = computed(() => {
  const resolved =
    typeof props.vacancy.updatedAt === 'string'
      ? parseISO(props.vacancy.updatedAt)
      : props.vacancy.updatedAt;
  return format(resolved, 'dd.MM.yyyy');
});

// Event handlers
const handleBack = () => {
  emit('back');
};

const handleToggleEdit = () => {
  emit('toggleEdit');
};

const handleDelete = () => {
  emit('delete');
};
</script>

<style lang="scss">
.vacancy-item-header {
  // Component-specific styling if needed
}
</style>
