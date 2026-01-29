<template>
  <div class="resume-form-section-skills space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        {{ $t('resume.form.skills.title') }}
        <span class="text-error">*</span>
      </h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addSkillGroup"
      >
        {{ $t('resume.form.skills.addGroup') }}
      </UButton>
    </div>

    <p class="text-xs text-muted">{{ $t('resume.form.skills.hint') }}</p>

    <!-- Skill Groups List -->
    <div class="space-y-4">
      <ResumeFormSectionSkillGroup
        v-for="(group, index) in modelValue"
        :key="index"
        :model-value="group"
        :disable-remove="modelValue.length <= 1"
        @update:model-value="updateSkillGroup(index, $event)"
        @remove="removeSkillGroup(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Skills Section
 *
 * Container for skill groups with minimum 1 group required
 */

import type { SkillGroup } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionSkills' });

const props = defineProps<{
  modelValue: SkillGroup[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SkillGroup[]];
}>();

const addSkillGroup = () => {
  emit('update:modelValue', [...props.modelValue, { type: '', skills: [] }]);
};

const removeSkillGroup = (index: number) => {
  // Don't allow removing the last group
  if (props.modelValue.length <= 1) return;

  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};

const updateSkillGroup = (index: number, value: SkillGroup) => {
  const updated = [...props.modelValue];
  updated[index] = value;
  emit('update:modelValue', updated);
};
</script>
