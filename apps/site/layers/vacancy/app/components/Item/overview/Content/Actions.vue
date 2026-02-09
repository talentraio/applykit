<template>
  <div
    class="vacancy-item-overview-content-actions mb-8 flex flex-col gap-3 sm:flex-row sm:items-center"
  >
    <UButton
      v-if="canGenerateButton"
      class="w-full justify-center sm:min-w-[220px] sm:w-auto"
      :loading="isGenerating"
      :disabled="isGenerating"
      :icon="generateActionIcon"
      size="lg"
      @click="emit('generate')"
    >
      {{ generateActionLabel }}
    </UButton>

    <UButton
      v-if="showResumeButton"
      class="w-full justify-center sm:min-w-[220px] sm:w-auto"
      variant="outline"
      icon="i-lucide-file-text"
      size="lg"
      :to="resumeTo"
    >
      {{ t('vacancy.overview.viewResume') }}
    </UButton>

    <UButton
      class="w-full justify-center sm:min-w-[220px] sm:w-auto"
      variant="outline"
      icon="i-lucide-mail"
      size="lg"
      :to="coverTo"
    >
      {{ t('vacancy.overview.generateCoverLetter') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'VacancyItemOverviewContentActions' });

const props = defineProps<{
  isGenerating: boolean;
  hasGeneration: boolean;
  canGenerateResume: boolean;
  resumeTo: string;
  coverTo: string;
}>();

const emit = defineEmits<{
  generate: [];
}>();

const { t } = useI18n();
const canGenerateButton = computed(() => props.canGenerateResume);
const showResumeButton = computed(() => props.hasGeneration);

const generateActionLabel = computed(() => {
  if (props.isGenerating) {
    return t('generation.inProgress');
  }

  return props.hasGeneration
    ? t('vacancy.overview.regenerateResume')
    : t('vacancy.overview.generateResume');
});

const generateActionIcon = computed(() =>
  props.hasGeneration ? 'i-lucide-refresh-cw' : 'i-lucide-sparkles'
);
</script>

<style lang="scss">
.vacancy-item-overview-content-actions {
  // Actions row wrapper
}
</style>
