<template>
  <UAlert
    color="info"
    variant="subtle"
    :close="{ color: 'neutral', variant: 'link' }"
    close-icon="i-lucide-x"
    class="resume-score-alert"
    @update:open="changeState"
  >
    <template #title>
      <div class="flex items-center gap-8 w-full">
        <div class="flex items-center gap-2">
          <UBadge color="neutral" variant="soft" size="lg">
            {{ t('generation.matchScore.before', { score: matchScoreBefore }) }}
          </UBadge>

          <UBadge color="success" variant="soft" size="lg">
            {{ t('generation.matchScore.after', { score: matchScoreAfter }) }}
          </UBadge>
        </div>

        <VacancyItemScoreDetailsButton :vacancy-id="vacancyId" :generation-id="generationId" />
      </div>
    </template>
  </UAlert>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyItemResumeScoreAlert' });

defineProps<{
  vacancyId: string;
  generationId: string;
  matchScoreBefore: number;
  matchScoreAfter: number;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const { t } = useI18n();

const changeState = (value: unknown) => {
  !value && emit('dismiss');
};
</script>
