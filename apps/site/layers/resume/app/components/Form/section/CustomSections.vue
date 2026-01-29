<template>
  <div class="resume-form-section-custom-sections space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('resume.form.customSections.title') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addSection"
      >
        {{ $t('resume.form.customSections.add') }}
      </UButton>
    </div>

    <p class="text-xs text-muted">{{ $t('resume.form.customSections.hint') }}</p>

    <!-- Empty State -->
    <div v-if="!modelValue || modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('resume.form.customSections.empty') }}</p>
    </div>

    <!-- Custom Sections List -->
    <div v-else class="space-y-4">
      <ResumeFormSectionCustomSectionEntry
        v-for="(section, index) in modelValue"
        :key="index"
        :model-value="section"
        @update:model-value="updateSection(index, $event)"
        @remove="removeSection(index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm CustomSections Container
 *
 * Container for custom sections (Open Source, Publications, Awards, etc.)
 */

import type { CustomSection } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionCustomSections' });

const props = defineProps<{
  modelValue?: CustomSection[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CustomSection[] | undefined];
}>();

const addSection = () => {
  const current = props.modelValue ?? [];
  emit('update:modelValue', [...current, { sectionTitle: '', items: [{ description: '' }] }]);
};

const removeSection = (index: number) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated.length > 0 ? updated : undefined);
};

const updateSection = (index: number, value: CustomSection) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  updated[index] = value;
  emit('update:modelValue', updated);
};
</script>
