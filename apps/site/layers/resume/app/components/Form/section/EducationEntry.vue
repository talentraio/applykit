<template>
  <div class="resume-form-section-education-entry rounded-lg border p-4 space-y-4">
    <!-- Institution (2/3) | Degree (1/3) -->
    <div class="grid gap-4" style="grid-template-columns: 2fr 1fr">
      <!-- Institution -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.education.institution') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.institution"
          :placeholder="$t('resume.form.education.institutionPlaceholder')"
          required
          size="md"
          class="w-full"
          @update:model-value="update('institution', $event)"
        />
      </div>

      <!-- Degree (with autocomplete) -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.education.degree') }}
          <span class="text-error">*</span>
        </label>
        <UInputMenu
          :model-value="modelValue.degree"
          :items="degreeOptions"
          :placeholder="$t('resume.form.education.degreePlaceholder')"
          size="md"
          class="w-full"
          @update:model-value="update('degree', $event)"
        />
      </div>
    </div>

    <!-- Field of Study -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.education.field') }}
      </label>
      <UInput
        :model-value="modelValue.field ?? ''"
        :placeholder="$t('resume.form.education.fieldPlaceholder')"
        size="md"
        class="w-full"
        @update:model-value="update('field', $event || undefined)"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <!-- Start Date -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.education.startDate') }}
          <span class="text-error">*</span>
        </label>
        <ResumeFormSectionDateInput
          :model-value="modelValue.startDate"
          @update:model-value="update('startDate', $event ?? '')"
        />
      </div>

      <!-- End Date -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.education.endDate') }}
        </label>
        <ResumeFormSectionDateInput
          :model-value="modelValue.endDate"
          @update:model-value="update('endDate', $event)"
        />
      </div>
    </div>

    <!-- Remove Button -->
    <div class="flex justify-end">
      <UButton
        type="button"
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        size="sm"
        @click="$emit('remove')"
      >
        {{ $t('common.remove') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm EducationEntry
 *
 * Single education entry with institution, degree, field, and dates
 */

import type { EducationEntry } from '@int/schema';
import { DEGREE_TYPE_VALUES } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionEducationEntry' });

const props = defineProps<{
  modelValue: EducationEntry;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: EducationEntry];
  remove: [];
}>();

// Use explicit string[] to avoid literal type inference issues with UInputMenu
const degreeOptions: string[] = [...DEGREE_TYPE_VALUES];

const update = <K extends keyof EducationEntry>(key: K, value: EducationEntry[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};
</script>
