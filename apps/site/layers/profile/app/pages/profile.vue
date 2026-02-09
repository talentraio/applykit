<template>
  <div class="profile-page p-4 py-8">
    <!-- Loading State -->
    <BasePageLoading v-if="loading && !profile" />

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Header -->
      <UiPageHeader :title="$t('profile.title')" :description="$t('profile.description')" />

      <!-- Redirect from Resume Upload Alert -->
      <UAlert v-if="fromResumeUpload" color="info" variant="soft" icon="i-lucide-info" class="mb-2">
        <template #title>
          {{ $t('profile.completeness.fromResumeUpload') }}
        </template>
      </UAlert>

      <!-- Completeness Status - Incomplete -->
      <UAlert
        v-if="!isComplete && profile"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-circle"
      >
        <template #title>
          {{ $t('profile.completeness.incomplete') }}
        </template>
        <template #description>
          <p>{{ $t('profile.completeness.incompleteDescription') }}</p>
          <ul class="mt-2 list-disc space-y-1 pl-4 text-sm">
            <li>{{ $t('profile.completeness.benefits.parsing') }}</li>
            <li>{{ $t('profile.completeness.benefits.matching') }}</li>
            <li>{{ $t('profile.completeness.benefits.tailoring') }}</li>
          </ul>
        </template>
      </UAlert>

      <!-- Completeness Status - New profile (no profile yet) -->
      <UAlert
        v-else-if="!isComplete && !profile"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-circle"
      >
        <template #title>
          {{ $t('profile.completeness.incomplete') }}
        </template>
        <template #description>
          <p>{{ $t('profile.completeness.incompleteDescription') }}</p>
          <ul class="mt-2 list-disc space-y-1 pl-4 text-sm">
            <li>{{ $t('profile.completeness.benefits.parsing') }}</li>
            <li>{{ $t('profile.completeness.benefits.matching') }}</li>
            <li>{{ $t('profile.completeness.benefits.tailoring') }}</li>
          </ul>
        </template>
      </UAlert>

      <!-- Completeness Status - Complete -->
      <UAlert v-else-if="isComplete" color="success" variant="soft" icon="i-lucide-check-circle">
        <template #title>
          {{ $t('profile.completeness.complete') }}
        </template>
      </UAlert>

      <!-- Form Card -->
      <UPageCard>
        <ProfileForm :profile="profile" :saving="isSaving" @save="handleSave" />
      </UPageCard>

      <!-- Delete Account Section -->
      <UPageCard v-if="profile">
        <ProfileFormSectionDeleteAccount @error="handleDeleteError" />
      </UPageCard>

      <!-- Save Error -->
      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('profile.error.saveFailed')"
        :description="saveError.message"
      />

      <!-- Save Success Toast would be handled by a global toast system -->
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Profile Page
 *
 * User profile management page
 * Allows users to create/edit their profile and check completeness
 *
 * T091 [US3] Profile page
 */

import type { ProfileInput } from '@int/schema';

defineOptions({ name: 'ProfilePage' });

// Auth is handled by global middleware

const { t } = useI18n();
const route = useRoute();

const { profile, isComplete, loading, error, saveProfile, checkCompleteness } = useProfile();

// Check if user was redirected from resume upload
const fromResumeUpload = computed(() => route.query.from === 'resume-upload');

const isSaving = ref(false);
const saveError = ref<Error | null>(null);

/**
 * Handle save
 */
const handleSave = async (data: ProfileInput) => {
  isSaving.value = true;
  saveError.value = null;

  try {
    await saveProfile(data);
    await checkCompleteness();

    // Success message would be shown via toast notification in production
  } catch (err) {
    console.error('Failed to save profile:', err);
    saveError.value = err instanceof Error ? err : new Error(t('profile.error.saveFailed'));
  } finally {
    isSaving.value = false;
  }
};

/**
 * Handle delete account error
 */
const handleDeleteError = (err: Error) => {
  saveError.value = err;
};

/**
 * Watch for errors during fetch
 */
watch(error, newError => {
  if (newError) {
    saveError.value = newError;
  }
});
</script>

<style lang="scss">
.profile-page {
  // Page-specific styles if needed
}
</style>
