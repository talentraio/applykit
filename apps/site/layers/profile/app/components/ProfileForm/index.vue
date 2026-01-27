<template>
  <div class="user-profile-form">
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- Basic Information Section -->
      <UserProfileFormSectionBasic v-model="basicData" />

      <!-- Languages Section -->
      <UserProfileFormSectionLanguages v-model="formData.languages" />

      <!-- Phone Numbers Section -->
      <UserProfileFormSectionPhone v-model="formData.phones" />

      <!-- Actions -->
      <UserProfileFormActions :show-cancel="showCancel" :saving="saving" @cancel="handleCancel" />
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Component
 *
 * Main form container for creating/editing user profile.
 * Orchestrates sub-components for each section.
 *
 * T090 [US3] ProfileForm component with all required fields
 * TR012 - Decomposed into sub-components
 */

import type { LanguageEntry, PhoneEntry, Profile, ProfileInput, WorkFormat } from '@int/schema';
import { WORK_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'UserProfileForm' });

const props = withDefaults(
  defineProps<{
    /**
     * Initial profile data (for editing)
     */
    profile?: Profile | null;
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
    profile: null,
    showCancel: false,
    saving: false
  }
);

const emit = defineEmits<{
  save: [data: ProfileInput];
  cancel: [];
}>();

// Form data structure
type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  searchRegion: string;
  workFormat: WorkFormat;
  languages: LanguageEntry[];
  phones: PhoneEntry[];
};

// Main form data
const formData = reactive<ProfileFormData>({
  firstName: props.profile?.firstName || '',
  lastName: props.profile?.lastName || '',
  email: props.profile?.email || '',
  country: props.profile?.country || '',
  searchRegion: props.profile?.searchRegion || '',
  workFormat: props.profile?.workFormat || WORK_FORMAT_MAP.REMOTE,
  languages: props.profile?.languages ? [...props.profile.languages] : [],
  phones: props.profile?.phones ? [...props.profile.phones] : []
});

// Computed for basic section (two-way binding)
const basicData = computed({
  get: () => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    country: formData.country,
    searchRegion: formData.searchRegion,
    workFormat: formData.workFormat
  }),
  set: value => {
    formData.firstName = value.firstName;
    formData.lastName = value.lastName;
    formData.email = value.email;
    formData.country = value.country;
    formData.searchRegion = value.searchRegion;
    formData.workFormat = value.workFormat;
  }
});

/**
 * Handle form submission
 */
const handleSubmit = () => {
  // Validate at least one language
  if (formData.languages.length === 0) {
    return;
  }

  // Build ProfileInput
  const data: ProfileInput = {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    country: formData.country.trim().toUpperCase(),
    searchRegion: formData.searchRegion.trim(),
    workFormat: formData.workFormat,
    languages: formData.languages.filter(l => l.language && l.level),
    phones:
      formData.phones.filter(p => p.number).length > 0
        ? formData.phones.filter(p => p.number)
        : undefined
  };

  emit('save', data);
};

/**
 * Handle cancel
 */
const handleCancel = () => {
  emit('cancel');
};

// Watch for profile changes (when editing)
watch(
  () => props.profile,
  newProfile => {
    if (newProfile) {
      formData.firstName = newProfile.firstName;
      formData.lastName = newProfile.lastName;
      formData.email = newProfile.email;
      formData.country = newProfile.country;
      formData.searchRegion = newProfile.searchRegion;
      formData.workFormat = newProfile.workFormat;
      formData.languages = [...newProfile.languages];
      formData.phones = newProfile.phones ? [...newProfile.phones] : [];
    }
  },
  { immediate: true }
);
</script>

<style lang="scss">
.user-profile-form {
  // Component-specific styles if needed
}
</style>
