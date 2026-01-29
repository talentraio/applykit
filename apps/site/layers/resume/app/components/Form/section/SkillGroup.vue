<template>
  <div class="resume-form-section-skill-group rounded-lg border p-4 space-y-4">
    <!-- Type Input -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.skills.type') }}
        <span class="text-error">*</span>
      </label>
      <UInput
        :model-value="modelValue.type"
        :placeholder="$t('resume.form.skills.typePlaceholder')"
        required
        size="md"
        class="w-full"
        @update:model-value="updateType"
      />
    </div>

    <!-- Skills Tags -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.skills.skills') }}
        <span class="text-error">*</span>
      </label>
      <div class="flex flex-wrap gap-2 mb-2">
        <UBadge
          v-for="(skill, index) in modelValue.skills"
          :key="index"
          color="primary"
          variant="soft"
          class="flex items-center gap-1"
        >
          {{ skill }}
          <button type="button" class="ml-1 hover:text-error" @click="removeSkill(index)">
            <UIcon name="i-lucide-x" class="h-3 w-3" />
          </button>
        </UBadge>
      </div>
      <div class="flex gap-2">
        <UInput
          v-model="newSkill"
          :placeholder="$t('resume.form.skills.skillPlaceholder')"
          size="md"
          class="flex-1"
          @keydown.enter.prevent="addSkill"
        />
        <UButton
          type="button"
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          size="md"
          :disabled="!newSkill.trim()"
          @click="addSkill"
        >
          {{ $t('common.add') }}
        </UButton>
      </div>
    </div>

    <!-- Remove Group Button -->
    <div class="flex justify-end">
      <UButton
        type="button"
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        size="sm"
        :disabled="disableRemove"
        @click="$emit('remove')"
      >
        {{ $t('common.remove') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm SkillGroup
 *
 * Single skill group with type and tag-style skills list
 */

import type { SkillGroup } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionSkillGroup' });

const props = defineProps<{
  modelValue: SkillGroup;
  disableRemove?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SkillGroup];
  remove: [];
}>();

const newSkill = ref('');

const updateType = (value: string) => {
  emit('update:modelValue', { ...props.modelValue, type: value });
};

const addSkill = () => {
  const skill = newSkill.value.trim();
  if (!skill) return;

  emit('update:modelValue', {
    ...props.modelValue,
    skills: [...props.modelValue.skills, skill]
  });
  newSkill.value = '';
};

const removeSkill = (index: number) => {
  const updatedSkills = [...props.modelValue.skills];
  updatedSkills.splice(index, 1);
  emit('update:modelValue', {
    ...props.modelValue,
    skills: updatedSkills
  });
};
</script>
