<template>
  <div class="resume-form-section-date-input flex gap-2">
    <USelectMenu
      :model-value="year"
      :items="yearOptions"
      value-key="value"
      :placeholder="$t('resume.form.date.year')"
      size="md"
      class="w-24"
      @update:model-value="handleYearUpdate"
    />
    <USelectMenu
      :model-value="month"
      :items="monthOptions"
      value-key="value"
      :placeholder="$t('resume.form.date.month')"
      size="md"
      class="w-20"
      :disabled="!year"
      @update:model-value="handleMonthUpdate"
    />
    <UButton
      v-if="modelValue"
      type="button"
      color="neutral"
      variant="ghost"
      icon="i-lucide-x"
      size="sm"
      @click="$emit('update:modelValue', undefined)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm DateInput
 *
 * Date picker with year and month dropdowns for YYYY-MM format
 */

defineOptions({ name: 'ResumeFormSectionDateInput' });

const props = defineProps<{
  modelValue?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const { t } = useI18n();

// Parse current value
const year = computed(() => {
  if (!props.modelValue) return undefined;
  return props.modelValue.substring(0, 4);
});

const month = computed(() => {
  if (!props.modelValue) return undefined;
  return props.modelValue.substring(5, 7);
});

// Year options (current year down to 50 years ago)
const currentYear = new Date().getFullYear();

type SelectOption = { label: string; value: string };

const yearOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [];
  for (let y = currentYear; y >= currentYear - 50; y--) {
    options.push({ label: String(y), value: String(y) });
  }
  return options;
});

// Month options
const monthOptions = computed<SelectOption[]>(() => [
  { label: t('resume.form.date.months.01'), value: '01' },
  { label: t('resume.form.date.months.02'), value: '02' },
  { label: t('resume.form.date.months.03'), value: '03' },
  { label: t('resume.form.date.months.04'), value: '04' },
  { label: t('resume.form.date.months.05'), value: '05' },
  { label: t('resume.form.date.months.06'), value: '06' },
  { label: t('resume.form.date.months.07'), value: '07' },
  { label: t('resume.form.date.months.08'), value: '08' },
  { label: t('resume.form.date.months.09'), value: '09' },
  { label: t('resume.form.date.months.10'), value: '10' },
  { label: t('resume.form.date.months.11'), value: '11' },
  { label: t('resume.form.date.months.12'), value: '12' }
]);

const handleYearUpdate = (value: unknown) => {
  if (typeof value !== 'string') return;
  // If we have a month, emit the full date; otherwise just wait for month
  if (month.value) {
    emit('update:modelValue', `${value}-${month.value}`);
  }
};

const handleMonthUpdate = (value: unknown) => {
  if (typeof value !== 'string' || !year.value) return;
  emit('update:modelValue', `${year.value}-${value}`);
};
</script>
