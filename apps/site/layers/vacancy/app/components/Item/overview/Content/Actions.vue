<template>
  <div
    class="vacancy-item-overview-content-actions mb-8 flex flex-col gap-3 sm:flex-row sm:items-center"
  >
    <UDropdownMenu
      v-if="showPickerButton"
      :items="generateDropdownItems"
      :ui="{
        content:
          'w-[var(--reka-dropdown-menu-trigger-width)] min-w-[var(--reka-dropdown-menu-trigger-width)]'
      }"
    >
      <UButton
        class="w-full justify-center sm:min-w-[220px] sm:w-auto"
        :loading="isGenerating"
        :disabled="isGenerating"
        :icon="generateActionIcon"
        trailing-icon="i-lucide-chevron-down"
        size="lg"
      >
        {{ generateActionLabel }}
      </UButton>
    </UDropdownMenu>

    <UButton
      v-else-if="canGenerateButton"
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
import type { DropdownMenuItem } from '#ui/types';

type ResumePickerItem = {
  id: string;
  label: string;
  isDefault: boolean;
};

defineOptions({ name: 'VacancyItemOverviewContentActions' });

const props = defineProps<{
  isGenerating: boolean;
  hasGeneration: boolean;
  canGenerateResume: boolean;
  resumeTo: string;
  coverTo: string;
  resumePickerItems?: ResumePickerItem[];
}>();

const emit = defineEmits<{
  generate: [resumeId?: string];
}>();

const { t } = useI18n();
const canGenerateButton = computed(() => props.canGenerateResume);
const showResumeButton = computed(() => props.hasGeneration);
const showPickerButton = computed(
  () => canGenerateButton.value && (props.resumePickerItems?.length ?? 0) > 1
);

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

const generateDropdownItems = computed<DropdownMenuItem[][]>(() => {
  const pickerItems = props.resumePickerItems ?? [];

  const options: DropdownMenuItem[] = pickerItems.map(item => ({
    label: item.label,
    icon: item.isDefault ? 'i-lucide-star' : 'i-lucide-file-text',
    disabled: props.isGenerating,
    onSelect: () => emit('generate', item.id)
  }));

  return [
    [
      {
        label: t('vacancy.generation.selectBaseResume'),
        disabled: true
      },
      ...options
    ]
  ];
});
</script>

<style lang="scss">
.vacancy-item-overview-content-actions {
  // Actions row wrapper
}
</style>
