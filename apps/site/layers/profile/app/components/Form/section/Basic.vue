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
          class="w-full"
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
          class="w-full"
          @update:model-value="update('lastName', $event)"
        />
      </div>
    </div>

    <!-- Email with Verification Status -->
    <div>
      <label class="mb-2 block text-sm font-medium">
        {{ $t('profile.form.email') }}
        <span class="text-error">*</span>
      </label>
      <div class="flex items-center gap-3">
        <UInput
          :model-value="modelValue.email"
          type="email"
          :placeholder="$t('profile.form.email')"
          required
          size="lg"
          class="flex-1"
          @update:model-value="update('email', $event)"
        />
        <!-- Email Verification Status -->
        <template v-if="emailVerified">
          <span class="flex items-center gap-1 text-sm text-success">
            <UIcon name="i-lucide-check-circle" class="h-4 w-4" />
            {{ $t('profile.form.emailVerified') }}
          </span>
        </template>
        <template v-else>
          <span class="flex items-center gap-1 text-sm text-warning">
            <UIcon name="i-lucide-alert-triangle" class="h-4 w-4" />
            {{ $t('profile.form.emailNotVerified') }}
          </span>
          <UButton
            size="xs"
            variant="outline"
            :loading="verificationLoading"
            @click="handleSendVerification"
          >
            {{ $t('profile.form.verifyEmail') }}
          </UButton>
        </template>
      </div>
      <p v-if="verificationSent" class="mt-1 text-sm text-success">
        {{ $t('profile.form.verificationSent') }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <!-- Country (ISO 3166-1 alpha-2) -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.country') }}
          <span class="text-error">*</span>
        </label>
        <USelectMenu
          :model-value="modelValue.country"
          :items="countryOptions"
          value-key="value"
          :placeholder="$t('profile.form.countryPlaceholder')"
          size="lg"
          required
          class="w-full"
          @update:model-value="handleCountryUpdate"
        />
      </div>

      <!-- Search Region -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('profile.form.searchRegion') }}
          <span class="text-error">*</span>
        </label>
        <USelectMenu
          :model-value="modelValue.searchRegion"
          :items="searchRegionOptions"
          value-key="value"
          :placeholder="$t('profile.form.searchRegionPlaceholder')"
          size="lg"
          required
          class="w-full"
          @update:model-value="handleSearchRegionUpdate"
        />
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
          class="w-full"
          @update:model-value="handleWorkFormatUpdate"
        />
      </div>
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
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

defineOptions({ name: 'ProfileFormSectionBasic' });

const props = defineProps<{
  modelValue: BasicData;
  emailVerified: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BasicData];
}>();

const { sendVerification } = useAuth();
const verificationLoading = ref(false);
const verificationSent = ref(false);

const emailVerified = computed(() => props.emailVerified);

const handleSendVerification = async () => {
  verificationLoading.value = true;
  try {
    await sendVerification();
    verificationSent.value = true;
    setTimeout(() => {
      verificationSent.value = false;
    }, 5000);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  } finally {
    verificationLoading.value = false;
  }
};

// Register English locale for country names
countries.registerLocale(enLocale);

type BasicData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  searchRegion: string;
  workFormat: WorkFormat;
};

const { t } = useI18n();

// Country options for searchable select
type CountryOption = { label: string; value: string };

const countryOptions = computed<CountryOption[]>(() => {
  const names = countries.getNames('en', { select: 'official' });
  return Object.entries(names)
    .map(([code, name]) => ({ label: name, value: code }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

// Work format options
type WorkFormatOption = { label: string; value: BasicData['workFormat'] };

const workFormatOptions = computed<WorkFormatOption[]>(() => [
  { label: t('profile.form.workFormatOptions.remote'), value: WORK_FORMAT_MAP.REMOTE },
  { label: t('profile.form.workFormatOptions.onsite'), value: WORK_FORMAT_MAP.ONSITE },
  { label: t('profile.form.workFormatOptions.hybrid'), value: WORK_FORMAT_MAP.HYBRID }
]);

// Search region options (popular job search regions)
type SearchRegionOption = { label: string; value: string };

const searchRegionOptions = computed<SearchRegionOption[]>(() => [
  { label: t('profile.form.searchRegionOptions.worldwide'), value: 'Worldwide' },
  { label: t('profile.form.searchRegionOptions.europe'), value: 'Europe' },
  { label: t('profile.form.searchRegionOptions.eu'), value: 'European Union' },
  { label: t('profile.form.searchRegionOptions.northAmerica'), value: 'North America' },
  { label: t('profile.form.searchRegionOptions.usa'), value: 'United States' },
  { label: t('profile.form.searchRegionOptions.uk'), value: 'United Kingdom' },
  { label: t('profile.form.searchRegionOptions.emea'), value: 'EMEA' },
  { label: t('profile.form.searchRegionOptions.apac'), value: 'Asia-Pacific' },
  { label: t('profile.form.searchRegionOptions.latam'), value: 'Latin America' },
  { label: t('profile.form.searchRegionOptions.middleEast'), value: 'Middle East' },
  { label: t('profile.form.searchRegionOptions.africa'), value: 'Africa' },
  { label: t('profile.form.searchRegionOptions.oceania'), value: 'Oceania' }
]);

const update = <K extends keyof BasicData>(key: K, value: BasicData[K] | null) => {
  // Skip update if value is null (from dropdown deselection)
  if (value === null) return;
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const handleCountryUpdate = (value: unknown) => {
  if (typeof value === 'string' && value.length === 2) {
    update('country', value);
  }
};

const handleSearchRegionUpdate = (value: unknown) => {
  if (typeof value === 'string') {
    update('searchRegion', value);
  }
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
