<template>
  <div class="resume-form-section-summary space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('resume.form.summary.title') }}</h3>

    <UTextarea
      :model-value="modelValue ?? ''"
      :rows="4"
      :placeholder="$t('resume.form.summary.placeholder')"
      size="lg"
      class="w-full"
      @update:model-value="$emit('update:modelValue', $event || undefined)"
    />
    <p class="text-xs text-muted">{{ $t('resume.form.summary.hint') }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Summary Section
 *
 * Optional textarea for professional summary
 */

defineOptions({ name: 'ResumeFormSectionSummary' });

defineProps<{
  modelValue?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();
</script>
