<template>
  <div class="vacancy-form">
    <UForm :state="formData" class="space-y-6" @submit="handleSubmit">
      <!-- Company Name -->
      <UFormField
        :label="$t('vacancy.form.company')"
        name="company"
        :hint="$t('vacancy.form.companyHint')"
        required
      >
        <UInput
          v-model="formData.company"
          class="w-full"
          :placeholder="$t('vacancy.form.companyPlaceholder')"
          size="lg"
        />
      </UFormField>

      <!-- Job Position -->
      <UFormField
        :label="$t('vacancy.form.jobPosition')"
        name="jobPosition"
        :hint="$t('vacancy.form.jobPositionHint')"
      >
        <UInput
          v-model="formData.jobPosition"
          class="w-full"
          :placeholder="$t('vacancy.form.jobPositionPlaceholder')"
          size="lg"
        />
      </UFormField>

      <!-- Description -->
      <UFormField
        :label="$t('vacancy.form.description')"
        name="description"
        :hint="$t('vacancy.form.descriptionHint')"
        required
      >
        <UTextarea
          v-model="formData.description"
          class="w-full"
          :placeholder="$t('vacancy.form.descriptionPlaceholder')"
          :rows="10"
          autoresize
        />
      </UFormField>

      <!-- URL -->
      <UFormField :label="$t('vacancy.form.url')" name="url" :hint="$t('vacancy.form.urlHint')">
        <UInput
          v-model="formData.url"
          class="w-full"
          :placeholder="$t('vacancy.form.urlPlaceholder')"
          type="url"
          size="lg"
        />
      </UFormField>

      <!-- Notes -->
      <UFormField
        :label="$t('vacancy.form.notes')"
        name="notes"
        :hint="$t('vacancy.form.notesHint')"
      >
        <UTextarea
          v-model="formData.notes"
          class="w-full"
          :placeholder="$t('vacancy.form.notesPlaceholder')"
          :rows="4"
          autoresize
        />
      </UFormField>

      <!-- Actions -->
      <div class="vacancy-form__actions flex gap-3 justify-end">
        <UButton v-if="showCancel" type="button" variant="ghost" @click="handleCancel">
          {{ $t('vacancy.form.cancel') }}
        </UButton>

        <UButton type="submit" :loading="saving">
          {{ saving ? $t('vacancy.form.submitting') : $t('vacancy.form.submit') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
/**
 * VacancyForm Component
 *
 * Form for creating or editing a job vacancy.
 * Uses Nuxt UI form components with validation.
 *
 * Related: T099 (US4)
 */

import type { Vacancy, VacancyInput } from '@int/schema';

defineOptions({ name: 'VacancyForm' });

const props = withDefaults(
  defineProps<{
    /**
     * Initial vacancy data (for editing)
     */
    vacancy?: Vacancy | null;
    /**
     * Show cancel button
     */
    showCancel?: boolean;
    /**
     * Loading state
     */
    saving?: boolean;
  }>(),
  {
    vacancy: null,
    showCancel: false,
    saving: false
  }
);

const emit = defineEmits<{
  save: [data: VacancyInput];
  cancel: [];
}>();

const { t: _t } = useI18n();

// Form data
const formData = reactive({
  company: props.vacancy?.company || '',
  jobPosition: props.vacancy?.jobPosition || '',
  description: props.vacancy?.description || '',
  url: props.vacancy?.url || '',
  notes: props.vacancy?.notes || ''
});

const handleSubmit = () => {
  emit('save', {
    company: formData.company,
    jobPosition: formData.jobPosition || null,
    description: formData.description,
    url: formData.url || null,
    notes: formData.notes || null
  });
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style lang="scss">
.vacancy-form {
  &__actions {
    // Actions styling if needed
  }
}
</style>
