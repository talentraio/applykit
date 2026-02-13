<template>
  <div class="site-default-layout">
    <!-- Navbar -->
    <LayoutHeader v-model:open="isMobileMenuOpen" :app-title="appTitle" class="h-16" />

    <!-- Main Content -->
    <main class="site-default-layout__main">
      <div class="site-default-layout__content">
        <slot />
      </div>
    </main>

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

<style lang="scss">
.site-default-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__main {
    flex: 1;
    min-height: 0;
  }

  &__content {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
