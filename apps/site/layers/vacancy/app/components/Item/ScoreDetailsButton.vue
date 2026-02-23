<template>
  <div class="flex items-center gap-2">
    <UButton
      v-if="canRequestDetails"
      size="sm"
      :loading="isLoading && actionType === 'details'"
      :disabled="isLoading"
      icon="i-lucide-list-checks"
      @click="handleOpenDetails(false)"
    >
      {{ t('vacancy.resume.details') }}
    </UButton>

    <UButton
      v-if="canRegenerateDetails"
      size="sm"
      variant="outline"
      :loading="isLoading && actionType === 'regenerate'"
      :disabled="isLoading"
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
const vacancyPreparationStore = useVacancyPreparationStore();
const { getCurrentVacancyMeta } = storeToRefs(vacancyStore);

const canRequestDetails = computed(
  () => getCurrentVacancyMeta.value?.canRequestScoreDetails ?? false
);
const canRegenerateDetails = computed(
  () => getCurrentVacancyMeta.value?.canRegenerateScoreDetails ?? false
);
const latestGenerationId = computed(
  () => getCurrentVacancyMeta.value?.latestGenerationId ?? props.generationId
);

const actionType = ref<'details' | 'regenerate' | null>(null);
const isLoading = ref(false);

const handleOpenDetails = async (regenerate: boolean): Promise<void> => {
  if (isLoading.value) return;

  const generationId = latestGenerationId.value;
  vacancyPreparationStore.setActiveContext(props.vacancyId, generationId);

  actionType.value = regenerate ? 'regenerate' : 'details';
  isLoading.value = true;

  try {
    if (!regenerate) {
      const cached = vacancyPreparationStore.getCachedScoreDetails(props.vacancyId, generationId);
      if (cached) {
        await navigateTo(`/vacancies/${props.vacancyId}/preparation`);
        return;
      }
    }

    await vacancyPreparationStore.fetchScoreDetails(props.vacancyId, generationId, { regenerate });
    await navigateTo(`/vacancies/${props.vacancyId}/preparation`);
  } catch {
    const toast = useToast();
    toast.add({
      title: t('vacancy.resume.detailsFailed'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    isLoading.value = false;
    actionType.value = null;
  }
};
</script>
