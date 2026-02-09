<template>
  <div class="settings-page p-4 py-8">
    <div class="space-y-6">
      <UiPageHeader :title="$t('settings.title')" :description="$t('settings.description')" />

      <UPageCard>
        <p class="text-sm text-muted">
          {{ $t('settings.platformOnlyNotice') }}
        </p>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Settings Page
 *
 * Platform-managed settings only.
 */

defineOptions({ name: 'SettingsPage' });
</script>

<style lang="scss">
.settings-page {
  // Page-specific styling if needed
}
</style>
