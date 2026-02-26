<template>
  <div v-if="vacancy" class="vacancy-overview-content">
    <VacancyItemOverviewContentTitle
      :vacancy="vacancy"
      @edit="emit('edit')"
      @delete="emit('delete')"
    />

    <VacancyItemOverviewContentMeta
      :vacancy="vacancy"
      :has-generation="hasGeneration"
      :is-updating-status="isUpdatingStatus"
      @status-change="handleStatusChange"
    />

    <VacancyItemOverviewContentActions
      :is-generating="isGenerating"
      :has-generation="hasGeneration"
      :has-cover-letter="hasCoverLetter"
      :can-generate-resume="canGenerateResume"
      :resume-to="resumeTo"
      :cover-to="coverTo"
      :resume-picker-items="resumePickerItems"
      @generate="handleGenerate"
    />

    <!-- Match Score Block (T024) - Only if generation exists -->
    <template v-if="overviewLatestGeneration">
      <VacancyItemOverviewContentGenerationMatchScore
        :vacancy-id="vacancyId"
        :generation-id="overviewLatestGeneration.id"
        :score-before="overviewLatestGeneration.matchScoreBefore"
        :score-after="overviewLatestGeneration.matchScoreAfter"
        class="mb-6"
      />

      <!-- Expires Block (T025) -->
      <VacancyItemOverviewContentGenerationLifetime
        :generation="overviewLatestGeneration"
        class="mb-6"
      />
    </template>

    <!-- Description Block (T026) -->
    <BaseContentBlock :title="t('vacancy.detail.description')" class="mb-6">
      {{ vacancy.description }}
    </BaseContentBlock>

    <!-- Notes Block (T026) - Conditional -->
    <BaseContentBlock v-if="vacancy.notes" :title="t('vacancy.detail.notes')" class="mb-6">
      {{ vacancy.notes }}
    </BaseContentBlock>
  </div>
</template>

<script setup lang="ts">
import type { VacancyStatus } from '@int/schema';

defineOptions({ name: 'VacancyItemOverviewContent' });

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const vacancyStore = useVacancyStore();
const generationStore = useVacancyResumeGenerationStore();
const resumeStore = useResumeStore();
const authStore = useAuthStore();
const { openProfileIncompleteModal } = useProfileIncompleteModal();
const {
  openGenerationStatusModal: openResumeGenerationModal,
  markGenerationStatusSuccess: markResumeGenerationSuccess,
  markGenerationStatusError: markResumeGenerationError
} = useGenerationStatusModal({
  overlayId: 'site-resume-generation-modal',
  overlayOpenStateKey: 'site-resume-generation-modal-overlay-open',
  sessionStateKey: 'site-resume-generation-modal-session'
});
const {
  getCurrentVacancy,
  getCurrentVacancyMeta,
  getOverviewLatestGeneration,
  getCanGenerateResume
} = storeToRefs(vacancyStore);
const { getGenerating } = storeToRefs(generationStore);
const { resumeList } = storeToRefs(resumeStore);
const isUpdatingStatus = ref(false);

const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const vacancy = computed(() => getCurrentVacancy.value);
const overviewLatestGeneration = computed(() => getOverviewLatestGeneration.value);
const hasGeneration = computed(() => overviewLatestGeneration.value !== null);
const hasCoverLetter = computed(() => getCurrentVacancyMeta.value?.hasCoverLetter ?? false);
const canGenerateResume = computed(() => getCanGenerateResume.value);
const isGenerating = computed(() => getGenerating.value);
const resumeTo = computed(() => `/vacancies/${vacancyId.value}/resume`);
const coverTo = computed(() => `/vacancies/${vacancyId.value}/cover`);
const resumePickerItems = computed(() => {
  return [...resumeList.value]
    .sort((first, second) => Number(second.isDefault) - Number(first.isDefault))
    .map(item => ({
      id: item.id,
      label: item.name,
      isDefault: item.isDefault
    }));
});

const handleGenerate = async (selectedResumeId?: string) => {
  if (!vacancyId.value) return;

  // Check profile completeness before generating
  if (!authStore.isProfileComplete) {
    await openProfileIncompleteModal({
      returnTo: `/vacancies/${vacancyId.value}`
    });
    return;
  }

  const subject = t('vacancy.overview.generationModal.loading.document.resume');
  const { sessionId, completion } = openResumeGenerationModal({
    titleSubject: subject,
    readyStatementSubject: subject,
    descriptionSubject: subject,
    waitingTime: t('vacancy.overview.generationModal.loading.waitingTime'),
    errorTitle: t('generation.error.generationFailed'),
    errorDescription: t('generation.error.generic'),
    errorMessage: t('generation.error.generic'),
    errorActionLabel: t('generation.statusModal.action.error')
  });

  try {
    await generationStore.generateResume(
      vacancyId.value,
      selectedResumeId ? { resumeId: selectedResumeId } : undefined
    );
    markResumeGenerationSuccess(sessionId);

    const closePayload = await completion;
    if (closePayload?.action === 'acknowledged-success') {
      await navigateTo(`/vacancies/${vacancyId.value}/resume`);
    }
  } catch {
    markResumeGenerationError(sessionId);
    await completion;
  }
};

const handleStatusChange = async (newStatus: VacancyStatus) => {
  if (!vacancyId.value) return;

  isUpdatingStatus.value = true;

  try {
    await vacancyStore.updateVacancy(vacancyId.value, { status: newStatus });

    toast.add({
      title: t('vacancy.status.updateSuccess'),
      color: 'success'
    });
  } catch (err) {
    toast.add({
      title: t('vacancy.status.updateFailed'),
      description: err instanceof Error ? err.message : undefined,
      color: 'error'
    });
  } finally {
    isUpdatingStatus.value = false;
  }
};
</script>

<style lang="scss">
.vacancy-overview-content {
  // Content wrapper for vacancy overview view mode
}
</style>
