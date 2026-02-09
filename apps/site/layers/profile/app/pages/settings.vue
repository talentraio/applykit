<template>
  <div class="settings-page p-4 py-8">
    <div class="space-y-6">
      <UiPageHeader :title="$t('settings.title')" :description="$t('settings.description')" />

      <UPageCard>
        <ProfileKeyManager />
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Settings Page
 *
 * Manages BYOK key metadata and local storage.
 *
 * Related: T131 (US7)
 */

defineOptions({ name: 'SettingsPage' });

const { fetchKeys } = useKeys();

await callOnce(async () => {
  await fetchKeys();
});
</script>

<style lang="scss">
.settings-page {
  // Page-specific styling if needed
}
</style>
