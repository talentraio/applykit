<template>
  <div class="resume-form-section-experience space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('resume.form.experience.title') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addExperience"
      >
        {{ $t('resume.form.experience.add') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('resume.form.experience.empty') }}</p>
    </div>

    <!-- Experience List -->
    <div v-else class="space-y-4">
      <ResumeFormSectionExperienceEntry
        v-for="(entry, index) in modelValue"
        :key="index"
        :model-value="entry"
        @update:model-value="updateExperience(index, $event)"
        @remove="removeExperience(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Experience Section
 *
 * Container for experience entries with add/remove functionality
 */

import type { ExperienceEntry } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionExperience' });

const props = defineProps<{
  modelValue: ExperienceEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ExperienceEntry[]];
}>();

const addExperience = () => {
  emit('update:modelValue', [
    ...props.modelValue,
    { company: '', position: '', startDate: '', description: '' }
  ]);
};

const removeExperience = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};

const updateExperience = (index: number, value: ExperienceEntry) => {
  const updated = [...props.modelValue];
  updated[index] = value;
  emit('update:modelValue', updated);
};
</script>
