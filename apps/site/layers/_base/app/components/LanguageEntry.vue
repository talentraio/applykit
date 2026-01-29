<template>
  <div class="language-entry grid grid-cols-2 gap-4">
    <UInput
      :model-value="modelValue.language"
      :placeholder="$t('profile.form.languagePlaceholder')"
      @update:model-value="updateField('language', $event)"
    />
    <USelectMenu
      :model-value="modelValue.level"
      :items="levelOptions"
      :placeholder="$t('profile.form.levelPlaceholder')"
      @update:model-value="updateField('level', $event)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Shared LanguageEntry Component
 *
 * Reusable component for language + level input
 * Used in both profile and resume forms
 */

import { LANGUAGE_LEVEL_VALUES } from '@int/schema';

defineOptions({ name: 'LanguageEntry' });

const props = defineProps<{
  modelValue: LanguageValue;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LanguageValue];
}>();

type LanguageValue = {
  language: string;
  level: string;
};

// Use explicit string[] to avoid literal type inference issues with USelectMenu
const levelOptions: string[] = [...LANGUAGE_LEVEL_VALUES];

const updateField = (field: keyof LanguageValue, value: string) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value });
};
</script>
