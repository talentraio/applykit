<template>
  <div class="user-profile-form-section-languages space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        {{ $t('profile.section.languages') }}
        <span class="text-error">*</span>
      </h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addLanguage"
      >
        {{ $t('profile.form.addLanguage') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('profile.languages.empty') }}</p>
    </div>

    <!-- Languages List -->
    <div v-else class="space-y-3">
      <div
        v-for="(lang, index) in modelValue"
        :key="index"
        class="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div class="min-w-0">
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('profile.form.language') }}
          </label>
          <UInput
            :model-value="lang.language"
            :placeholder="$t('profile.form.languagePlaceholder')"
            required
            size="md"
            class="w-full"
            @update:model-value="updateLanguage(index, 'language', $event)"
          />
        </div>
        <div class="min-w-0">
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('profile.form.languageLevel') }}
          </label>
          <USelectMenu
            :model-value="lang.level"
            :items="languageLevelOptions"
            value-key="value"
            :placeholder="$t('profile.form.levelPlaceholder')"
            :search-input="false"
            required
            size="md"
            class="w-full"
            @update:model-value="handleLevelUpdate(index, $event)"
          />
        </div>
        <div class="flex items-end justify-end sm:justify-start">
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
 * ProfileForm Languages Section
 *
 * Handles dynamic list of languages with add/remove functionality
 *
 * TR012 - Created as part of ProfileForm decomposition
 */

import type { LanguageEntry } from '@int/schema';

defineOptions({ name: 'ProfileFormSectionLanguages' });

const props = defineProps<{
  modelValue: LanguageEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LanguageEntry[]];
}>();

const { t } = useI18n();

// LinkedIn-style language proficiency levels
type LevelOption = { label: string; value: string };

const languageLevelOptions = computed<LevelOption[]>(() => [
  { label: t('profile.form.languageLevelOptions.native'), value: 'Native or bilingual' },
  { label: t('profile.form.languageLevelOptions.fullProfessional'), value: 'Full professional' },
  { label: t('profile.form.languageLevelOptions.professional'), value: 'Professional working' },
  { label: t('profile.form.languageLevelOptions.limited'), value: 'Limited working' },
  { label: t('profile.form.languageLevelOptions.elementary'), value: 'Elementary' }
]);

const addLanguage = () => {
  emit('update:modelValue', [...props.modelValue, { language: '', level: '' }]);
};

const removeLanguage = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};

const updateLanguage = (index: number, field: keyof LanguageEntry, value: string) => {
  const updated = [...props.modelValue];
  const current = updated[index];
  if (!current) return; // Guard against undefined

  // Explicitly preserve all required fields to satisfy TypeScript
  updated[index] = {
    language: current.language,
    level: current.level,
    [field]: value
  };
  emit('update:modelValue', updated);
};

const handleLevelUpdate = (index: number, value: unknown) => {
  if (typeof value === 'string') {
    updateLanguage(index, 'level', value);
  }
};
</script>
