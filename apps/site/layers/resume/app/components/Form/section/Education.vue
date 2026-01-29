<template>
  <div class="resume-form-section-education space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('resume.form.education.title') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addEducation"
      >
        {{ $t('resume.form.education.add') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('resume.form.education.empty') }}</p>
    </div>

    <!-- Education List -->
    <div v-else class="space-y-4">
      <ResumeFormSectionEducationEntry
        v-for="(entry, index) in modelValue"
        :key="index"
        :model-value="entry"
        @update:model-value="updateEducation(index, $event)"
        @remove="removeEducation(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Education Section
 *
 * Container for education entries with add/remove functionality
 */

import type { EducationEntry } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionEducation' });

const props = defineProps<{
  modelValue: EducationEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: EducationEntry[]];
}>();

const addEducation = () => {
  emit('update:modelValue', [...props.modelValue, { institution: '', degree: '', startDate: '' }]);
};

const removeEducation = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};

const updateEducation = (index: number, value: EducationEntry) => {
  const updated = [...props.modelValue];
  updated[index] = value;
  emit('update:modelValue', updated);
};
</script>
