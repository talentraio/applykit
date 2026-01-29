<template>
  <div class="resume-form-section-languages space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('resume.form.languages.title') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addLanguage"
      >
        {{ $t('resume.form.languages.add') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="!modelValue || modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('resume.form.languages.empty') }}</p>
    </div>

    <!-- Languages List -->
    <div v-else class="space-y-3">
      <div
        v-for="(lang, index) in modelValue"
        :key="index"
        class="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('resume.form.languages.language') }}
          </label>
          <UInput
            :model-value="lang.language"
            :placeholder="$t('resume.form.languages.languagePlaceholder')"
            required
            size="md"
            class="w-full"
            @update:model-value="updateLanguage(index, 'language', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('resume.form.languages.level') }}
          </label>
          <USelectMenu
            :model-value="lang.level"
            :items="levelOptions"
            :placeholder="$t('resume.form.languages.levelPlaceholder')"
            size="md"
            class="w-full"
            @update:model-value="updateLanguage(index, 'level', $event)"
          />
        </div>
        <div class="flex items-end">
          <UButton
            type="button"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            @click="removeLanguage(index)"
          >
            {{ $t('common.remove') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Languages Section
 *
 * Handles dynamic list of languages with add/remove functionality
 */

import type { ResumeLanguage } from '@int/schema';
import { LANGUAGE_LEVEL_VALUES } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionLanguages' });

const props = defineProps<{
  modelValue?: ResumeLanguage[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ResumeLanguage[] | undefined];
}>();

// Use explicit string[] to avoid literal type inference issues with USelectMenu
const levelOptions: string[] = [...LANGUAGE_LEVEL_VALUES];

const addLanguage = () => {
  const current = props.modelValue ?? [];
  emit('update:modelValue', [...current, { language: '', level: '' }]);
};

const removeLanguage = (index: number) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated.length > 0 ? updated : undefined);
};

const updateLanguage = (index: number, field: keyof ResumeLanguage, value: string) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  const current = updated[index];
  if (!current) return;

  updated[index] = {
    language: current.language,
    level: current.level,
    [field]: value
  };
  emit('update:modelValue', updated);
};
</script>
