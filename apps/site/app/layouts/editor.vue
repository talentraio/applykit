<template>
  <div class="site-editor-layout">
    <!-- Navbar -->
    <LayoutHeader
      v-model:open="isMobileMenuOpen"
      :app-title="appTitle"
      class="site-editor-layout__header h-16"
    />

    <!-- Main Content (no footer for full-screen editor) -->
    <main class="site-editor-layout__main">
      <slot />
    </main>

    <!-- Mobile Navigation Drawer -->
    <LayoutMobileNav v-model:open="isMobileMenuOpen" />

    <!-- Auth Modal -->
    <AuthModal />
  </div>
</template>

<script setup lang="ts">
/**
 * Editor Layout
 *
 * Full-screen layout for editor pages (resume, vacancy)
 * Same as default but without footer for maximum editing space.
 *
 * Uses CSS variable --layout-header-height for consistent sizing.
 */

defineOptions({ name: 'SiteEditorLayout' });

const appTitle = 'ApplyKit';
const isMobileMenuOpen = ref(false);
</script>

<style lang="scss">
.site-editor-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;

  &__main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
</style>
