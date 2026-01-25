<template>
  <div class="ui-app-shell">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * AppShell Component
 *
 * Main application shell wrapper using Nuxt UI Pro patterns
 * Provides consistent spacing and structure for dashboard-style apps
 *
 * Per docs/design/mvp.md - uses Dashboard template patterns
 */

defineOptions({ name: 'UiAppShell' });
</script>
