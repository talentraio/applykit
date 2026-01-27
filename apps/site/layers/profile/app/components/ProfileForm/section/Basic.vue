<template>
  <div class="user-profile-form-section-basic space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('profile.section.basic') }}</h3>

    <div class="grid gap-4 sm:grid-cols-2">
      <!-- First Name -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.firstName') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.firstName"
          :placeholder="$t('profile.form.firstName')"
          required
          size="lg"
          @update:model-value="update('firstName', $event)"
        />
      </div>

      <!-- Last Name -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.lastName') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.lastName"
          :placeholder="$t('profile.form.lastName')"
          required
          size="lg"
          @update:model-value="update('lastName', $event)"
        />
      </div>
    </div>

    <!-- Email -->
    <div>
      <label class="mb-2 block text-sm font-medium">
        {{ $t('profile.form.email') }}
        <span class="text-error">*</span>
      </label>
      <UInput
        :model-value="modelValue.email"
        type="email"
        :placeholder="$t('profile.form.email')"
        required
        size="lg"
        @update:model-value="update('email', $event)"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <!-- Country (ISO 3166-1 alpha-2) -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.country') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.country"
          :placeholder="$t('profile.form.country')"
          maxlength="2"
          required
          size="lg"
          @update:model-value="update('country', $event)"
        />
        <p class="mt-1 text-xs text-muted">{{ $t('profile.form.countryHint') }}</p>
      </div>

      <!-- Search Region -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.searchRegion') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.searchRegion"
          :placeholder="$t('profile.form.searchRegion')"
          required
          size="lg"
          @update:model-value="update('searchRegion', $event)"
        />
      </div>
    </div>

    <!-- Work Format -->
    <div>
      <label class="mb-2 block text-sm font-medium">
        {{ $t('profile.form.workFormat') }}
        <span class="text-error">*</span>
      </label>
      <USelectMenu
        :model-value="modelValue.workFormat"
        :items="workFormatOptions"
        value-key="value"
        size="lg"
        required
        @update:model-value="handleWorkFormatUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Basic Section
 *
 * Handles basic profile fields: name, email, country, region, work format
 *
 * TR012 - Created as part of ProfileForm decomposition
 */

import type { WorkFormat } from '@int/schema';
import { WORK_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'UserProfileFormSectionBasic' });

const props = defineProps<{
  modelValue: BasicData;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BasicData];
}>();

type BasicData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  searchRegion: string;
  workFormat: WorkFormat;
};

const { t } = useI18n();

type WorkFormatOption = { label: string; value: BasicData['workFormat'] };

const workFormatOptions = computed<WorkFormatOption[]>(() => [
  { label: t('profile.form.workFormatOptions.remote'), value: WORK_FORMAT_MAP.REMOTE },
  { label: t('profile.form.workFormatOptions.onsite'), value: WORK_FORMAT_MAP.ONSITE },
  { label: t('profile.form.workFormatOptions.hybrid'), value: WORK_FORMAT_MAP.HYBRID }
]);

const update = <K extends keyof BasicData>(key: K, value: BasicData[K] | null) => {
  // Skip update if value is null (from dropdown deselection)
  if (value === null) return;
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const workFormatValues: ReadonlyArray<WorkFormat> = Object.values(WORK_FORMAT_MAP);

const isValidWorkFormat = (value: unknown): value is WorkFormat => {
  return typeof value === 'string' && workFormatValues.includes(value as WorkFormat);
};

const handleWorkFormatUpdate = (value: unknown) => {
  // USelectMenu with value-key returns the value directly
  if (isValidWorkFormat(value)) {
    update('workFormat', value);
  }
};
</script>
