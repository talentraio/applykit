<template>
  <div class="profile-page container mx-auto max-w-4xl p-4 py-8">
    <!-- Loading State -->
    <div v-if="loading && !profile" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('profile.title') }}
        </h1>
        <p class="mt-2 text-muted">Complete your profile to enable resume generation</p>
      </div>

      <!-- Completeness Status -->
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
          {{ $t('profile.completeness.missing') }}
        </template>
      </UAlert>

      <UAlert v-else-if="isComplete" color="success" variant="soft" icon="i-lucide-check-circle">
        <template #title>
          {{ $t('profile.completeness.complete') }}
        </template>
      </UAlert>

      <!-- Form Card -->
      <UPageCard>
        <ProfileForm :profile="profile" :saving="isSaving" @save="handleSave" />
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

const { profile, isComplete, loading, error, saveProfile, checkCompleteness } = useProfile();

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
