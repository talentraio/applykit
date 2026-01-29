<template>
  <div class="user-profile-form-section-terms space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('profile.form.terms.title') }}</h3>

    <div class="user-profile-form-section-terms__agreement">
      <UCheckbox
        :model-value="modelValue"
        required
        :label="agreementLabel"
        @update:model-value="handleCheckboxChange"
      />

      <p class="mt-2 text-sm text-muted">
        {{ $t('profile.form.terms.agreement') }}
        <NuxtLink to="/terms" class="text-primary hover:underline">
          {{ $t('profile.form.terms.termsLink') }}
        </NuxtLink>
        {{ $t('profile.form.terms.and') }}
        <NuxtLink to="/privacy" class="text-primary hover:underline">
          {{ $t('profile.form.terms.privacyLink') }}
        </NuxtLink>
      </p>

      <p v-if="showError" class="mt-2 text-sm text-error">
        {{ $t('profile.form.terms.required') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Terms Section
 *
 * Required checkbox for accepting Terms of Service and Privacy Policy
 *
 * Shows links to /terms and /privacy pages
 */

defineOptions({ name: 'ProfileFormSectionTerms' });

defineProps<{
  modelValue: boolean;
  showError?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();

const agreementLabel = computed(() => t('profile.form.terms.agreement'));

const handleCheckboxChange = (value: boolean | string) => {
  // UCheckbox can emit boolean or string, we only want boolean
  emit('update:modelValue', value === true);
};
</script>

<style lang="scss">
.user-profile-form-section-terms {
  &__agreement {
    @apply rounded-lg border border-neutral-200 p-4 dark:border-neutral-700;
  }
}
</style>
