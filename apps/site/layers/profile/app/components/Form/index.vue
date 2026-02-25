<template>
  <div class="user-profile-form">
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- Photo Section -->
      <ProfileFormSectionPhoto v-model="formData.photoUrl" />

      <!-- Basic Information Section -->
      <ProfileFormSectionBasic v-model="basicData" :email-verified="emailVerified" />

      <!-- TODO: temporarily hidden, re-enable when languages section is ready -->
      <!-- <ProfileFormSectionLanguages v-model="formData.languages" /> -->

      <!-- Phone Numbers Section -->
      <ProfileFormSectionPhone v-model="formData.phones" />

      <!-- Actions -->
      <ProfileFormActions :show-cancel="showCancel" :saving="saving" @cancel="handleCancel" />
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

import type {
  GrammaticalGender,
  LanguageEntry,
  PhoneEntry,
  Profile,
  ProfileInput,
  WorkFormat
} from '@int/schema';
import { GRAMMATICAL_GENDER_MAP, WORK_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'ProfileForm' });

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
  grammaticalGender: GrammaticalGender;
  languages?: LanguageEntry[];
  phones: PhoneEntry[];
  photoUrl?: string;
};

// Get current user for email verification status
const { user } = useAuth();

// Email verification status from user
const emailVerified = computed(() => user.value?.emailVerified ?? true);

// Main form data
const formData = reactive<ProfileFormData>({
  firstName: props.profile?.firstName || '',
  lastName: props.profile?.lastName || '',
  // If profile doesn't have email, use user email as fallback (for new profiles after OAuth)
  email: props.profile?.email || user.value?.email || '',
  country: props.profile?.country || '',
  searchRegion: props.profile?.searchRegion || '',
  workFormat: props.profile?.workFormat || WORK_FORMAT_MAP.REMOTE,
  grammaticalGender: props.profile?.grammaticalGender || GRAMMATICAL_GENDER_MAP.NEUTRAL,
  languages: props.profile?.languages ? [...props.profile.languages] : [],
  phones: props.profile?.phones ? [...props.profile.phones] : [],
  photoUrl: props.profile?.photoUrl
});

// Computed for basic section (two-way binding)
const basicData = computed({
  get: () => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    country: formData.country,
    searchRegion: formData.searchRegion,
    workFormat: formData.workFormat,
    grammaticalGender: formData.grammaticalGender
  }),
  set: value => {
    formData.firstName = value.firstName;
    formData.lastName = value.lastName;
    formData.email = value.email;
    formData.country = value.country;
    formData.searchRegion = value.searchRegion;
    formData.workFormat = value.workFormat;
    formData.grammaticalGender = value.grammaticalGender;
  }
});

/**
 * Handle form submission
 */
const handleSubmit = () => {
  // TODO: restore language validation when languages section is re-enabled
  // if (formData.languages?.length === 0) {
  //   return;
  // }

  // Build ProfileInput
  const data: ProfileInput = {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    country: formData.country.trim().toUpperCase(),
    searchRegion: formData.searchRegion.trim(),
    workFormat: formData.workFormat,
    grammaticalGender: formData.grammaticalGender,
    languages: formData.languages?.filter(l => l.language && l.level),
    phones:
      formData.phones.filter(p => p.number).length > 0
        ? formData.phones.filter(p => p.number)
        : undefined,
    photoUrl: formData.photoUrl
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
      formData.grammaticalGender = newProfile.grammaticalGender;
      formData.languages = newProfile.languages ? [...newProfile.languages] : [];
      formData.phones = newProfile.phones ? [...newProfile.phones] : [];
      formData.photoUrl = newProfile.photoUrl;
    } else {
      // New profile - prefill email from user (e.g., after OAuth login)
      if (user.value?.email && !formData.email) {
        formData.email = user.value.email;
      }
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
