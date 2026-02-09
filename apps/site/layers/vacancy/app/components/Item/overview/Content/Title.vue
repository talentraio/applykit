<template>
  <div class="vacancy-item-overview-content-title mb-6">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h1 class="text-2xl font-bold">{{ vacancy.company }}</h1>
        <p v-if="vacancy.jobPosition" class="text-lg text-muted">
          {{ vacancy.jobPosition }}
        </p>
      </div>

      <div class="vacancy-item-overview-content-title__actions flex gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-pencil"
          :aria-label="t('vacancy.detail.actions.edit')"
          @click="emit('edit')"
        />
        <UButton
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          :aria-label="t('vacancy.detail.actions.delete')"
          @click="emit('delete')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Vacancy } from '@int/schema';

defineOptions({ name: 'VacancyItemOverviewContentTitle' });

defineProps<{
  vacancy: Vacancy;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss">
.vacancy-item-overview-content-title {
  &__actions {
    flex-shrink: 0;
  }
}
</style>
