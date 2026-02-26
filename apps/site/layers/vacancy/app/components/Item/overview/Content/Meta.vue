<template>
  <div
    class="vacancy-item-overview-content-meta mb-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:gap-4"
  >
    <div
      class="vacancy-item-overview-content-meta__dates order-2 flex w-full items-center gap-4 rounded-md border border-default px-3 py-2 sm:order-1 sm:w-auto sm:rounded-none sm:border-none sm:p-0"
    >
      <span>{{ t('vacancy.list.columns.updatedAt') }}: {{ formattedUpdatedAt }}</span>
      <span>{{ t('vacancy.list.columns.createdAt') }}: {{ formattedCreatedAt }}</span>
    </div>

    <div
      class="vacancy-item-overview-content-meta__actions order-1 flex w-full items-center justify-between gap-3 sm:order-2 sm:w-auto sm:justify-end"
    >
      <VacancyStatusBadge
        class="order-1 sm:order-2"
        :status="vacancy.status"
        :has-generation="hasGeneration"
        :loading="isUpdatingStatus"
        @change="emit('statusChange', $event)"
      />

      <UButton
        v-if="safeVacancyUrl"
        class="order-2 sm:order-1"
        variant="link"
        color="primary"
        size="xs"
        icon="i-lucide-external-link"
        :to="safeVacancyUrl"
        target="_blank"
      >
        {{ t('vacancy.detail.url') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Vacancy, VacancyStatus } from '@int/schema';
import { isSafeHttpUrl } from '@int/schema';

defineOptions({ name: 'VacancyItemOverviewContentMeta' });

const props = defineProps<{
  vacancy: Vacancy;
  hasGeneration: boolean;
  isUpdatingStatus: boolean;
}>();

const emit = defineEmits<{
  statusChange: [status: VacancyStatus];
}>();

const { t } = useI18n();

const resolveIsoDate = (dateValue: Date | string): string =>
  typeof dateValue === 'string' ? dateValue : dateValue.toISOString();

const formattedUpdatedAt = computed(() => {
  return dateBaseFormat(resolveIsoDate(props.vacancy.updatedAt));
});

const formattedCreatedAt = computed(() => dateBaseFormat(resolveIsoDate(props.vacancy.createdAt)));
const safeVacancyUrl = computed(() => {
  const url = props.vacancy.url;
  return url && isSafeHttpUrl(url) ? url : null;
});
</script>

<style lang="scss">
.vacancy-item-overview-content-meta {
  &__dates {
    min-width: 0;
  }

  &__actions {
    flex-shrink: 0;
  }
}
</style>
