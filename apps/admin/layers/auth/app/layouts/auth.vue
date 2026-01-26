<template>
  <div class="auth-layout min-h-screen bg-background">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Auth Layout
 *
 * Minimal layout for admin authentication pages.
 */

defineOptions({ name: 'AuthLayout' });
</script>
