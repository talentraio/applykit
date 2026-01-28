<template>
  <UPageCard class="users-user-card-profile">
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ $t('admin.users.detail.profile') }}
      </h2>
    </template>

    <div v-if="!profile" class="py-6 text-sm text-muted">
      {{ $t('admin.users.profile.empty') }}
    </div>

    <div v-else class="space-y-3 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.firstName') }}</span>
        <span class="font-medium">{{ profile.firstName }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.lastName') }}</span>
        <span class="font-medium">{{ profile.lastName }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.email') }}</span>
        <span class="font-medium">{{ profile.email }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.country') }}</span>
        <span class="font-medium">{{ profile.country }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.searchRegion') }}</span>
        <span class="font-medium">{{ profile.searchRegion }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('profile.form.workFormat') }}</span>
        <span class="font-medium">{{ workFormatLabel }}</span>
      </div>
      <div class="space-y-1">
        <span class="text-muted">{{ $t('profile.form.languages') }}</span>
        <div class="font-medium">
          {{ languagesLabel }}
        </div>
      </div>
      <div class="space-y-1">
        <span class="text-muted">{{ $t('profile.form.phones') }}</span>
        <div class="font-medium">
          {{ phonesLabel }}
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.users.fields.profileCreatedAt') }}</span>
        <span class="font-medium">{{ profileCreatedAt }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.users.fields.profileUpdatedAt') }}</span>
        <span class="font-medium">{{ profileUpdatedAt }}</span>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * UserCardProfile Component
 *
 * Profile summary for the admin user detail page.
 */

import type { Profile } from '@int/schema';

defineOptions({ name: 'UsersUserCardProfile' });

defineProps<{
  profile: Profile | null;
  workFormatLabel: string;
  languagesLabel: string;
  phonesLabel: string;
  profileCreatedAt: string;
  profileUpdatedAt: string;
}>();
</script>

<style lang="scss">
.users-user-card-profile {
  // Reserved for profile card styling
}
</style>
