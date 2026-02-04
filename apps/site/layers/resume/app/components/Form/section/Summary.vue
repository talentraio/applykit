<template>
  <div class="resume-form-section-summary space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('resume.form.summary.title') }}</h3>

    <UTextarea
      v-model="summaryText"
      :rows="4"
      :placeholder="$t('resume.form.summary.placeholder')"
      size="lg"
      class="w-full"
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

const modelValue = defineModel<string | undefined>({ default: undefined });

const summaryText = computed({
  get: () => modelValue.value ?? '',
  set: value => {
    modelValue.value = value || undefined;
  }
});
</script>
