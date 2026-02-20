<template>
  <div class="flex items-center gap-2">
    <UButton
      v-if="canRequestDetails"
      size="sm"
      :loading="loading && actionType === 'details'"
      :disabled="loading"
      icon="i-lucide-list-checks"
      @click="handleOpenDetails(false)"
    >
      {{ t('vacancy.resume.details') }}
    </UButton>

    <UButton
      v-if="canRegenerateDetails"
      size="sm"
      variant="outline"
      :loading="loading && actionType === 'regenerate'"
      :disabled="loading"
      icon="i-lucide-refresh-cw"
      @click="handleOpenDetails(true)"
    >
      {{ t('vacancy.resume.regenerateDetails') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyItemScoreDetailsButton' });

const props = defineProps<{
  vacancyId: string;
  generationId: string;
}>();

const { t } = useI18n();
const vacancyStore = useVacancyStore();
const { getCurrentVacancyMeta, getScoreDetailsLoading } = storeToRefs(vacancyStore);

const canRequestDetails = computed(
  () => getCurrentVacancyMeta.value?.canRequestScoreDetails ?? false
);
const canRegenerateDetails = computed(
  () => getCurrentVacancyMeta.value?.canRegenerateScoreDetails ?? false
);
const loading = computed(() => getScoreDetailsLoading.value);

const actionType = ref<'details' | 'regenerate' | null>(null);

const handleOpenDetails = async (regenerate: boolean): Promise<void> => {
  actionType.value = regenerate ? 'regenerate' : 'details';

  try {
    await vacancyStore.fetchScoreDetails(props.vacancyId, props.generationId, { regenerate });
    await navigateTo(`/vacancies/${props.vacancyId}/preparation`);
  } catch {
    const toast = useToast();
    toast.add({
      title: t('vacancy.resume.detailsFailed'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    actionType.value = null;
  }
};
</script>
