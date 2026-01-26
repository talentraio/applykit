<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
/**
 * App Root Component
 *
 * Minimal app shell - all logic should be in plugins or layouts.
 * This component only orchestrates layout and page rendering.
 *
 * TR010 - Created as part of architecture refactoring
 */

defineOptions({ name: 'App' });
</script>
