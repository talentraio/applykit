<template>
  <div class="site-default-layout flex min-h-screen flex-col">
    <!-- Navbar -->
    <LayoutHeader v-model:open="isMobileMenuOpen" :app-title="appTitle" class="h-16" />

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Mobile Navigation Drawer -->
    <LayoutMobileNav v-model:open="isMobileMenuOpen" />

    <!-- Auth Modal -->
    <AuthModal />
  </div>
</template>

<script setup lang="ts">
/**
 * Default Site Layout
 *
 * Main layout with responsive navigation
 * - Desktop: horizontal navbar with links
 * - Mobile: burger menu opens drawer with navigation
 *
 * TR010 - Created as part of architecture refactoring
 * T154 [Phase 12] Default layout with navigation
 */

defineOptions({ name: 'SiteDefaultLayout' });

const appTitle = 'ApplyKit';
const isMobileMenuOpen = ref(false);
</script>
