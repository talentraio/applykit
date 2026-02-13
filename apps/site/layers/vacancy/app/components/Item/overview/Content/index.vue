<template>
  <div v-if="vacancy" class="vacancy-overview-content">
    <ProfileIncompleteModal
      v-model:open="showProfileModal"
      :return-to="`/vacancies/${vacancyId}`"
    />
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
      :can-generate-resume="canGenerateResume"
      :resume-to="resumeTo"
      :cover-to="coverTo"
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
import { useApiAuthStore } from '@layer/api/app/stores/auth';

defineOptions({ name: 'VacancyItemOverviewContent' });

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const vacancyStore = useVacancyStore();
const authStore = useApiAuthStore();
const { currentVacancy, overviewLatestGeneration, overviewCanGenerateResume } =
  storeToRefs(vacancyStore);
const isGenerating = ref(false);
const isUpdatingStatus = ref(false);
const showProfileModal = ref(false);

const vacancyId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
});

const vacancy = computed(() => currentVacancy.value);
const hasGeneration = computed(() => overviewLatestGeneration.value !== null);
const canGenerateResume = computed(() => overviewCanGenerateResume.value);
const resumeTo = computed(() => `/vacancies/${vacancyId.value}/resume`);
const coverTo = computed(() => `/vacancies/${vacancyId.value}/cover`);

const handleGenerate = async () => {
  if (!vacancyId.value) return;

  // Check profile completeness before generating
  if (!authStore.isProfileComplete) {
    showProfileModal.value = true;
    return;
  }

  isGenerating.value = true;

  try {
    await vacancyStore.generateResume(vacancyId.value);
    await navigateTo(`/vacancies/${vacancyId.value}/resume`);
  } catch {
    toast.add({
      title: t('generation.error.generic'),
      color: 'error'
    });
  } finally {
    isGenerating.value = false;
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
