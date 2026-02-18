<template>
  <div class="site-editor-layout">
    <!-- Navbar -->
    <AppLayoutHeader
      v-model:open="isMobileMenuOpen"
      :app-title="appTitle"
      class="site-editor-layout__header h-16"
    />

    <!-- Main Content (no footer for full-screen editor) -->
    <main class="site-editor-layout__main">
      <div class="site-editor-layout__content">
        <slot />
      </div>
    </main>

    <!-- Mobile Navigation Drawer -->
    <AppLayoutMobileNav v-model:open="isMobileMenuOpen" />
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

  &__content {
    width: 100%;
    height: 100%;
    min-height: 0;
    max-width: 1600px;
    margin: 0 auto;
    overflow: hidden;
  }
}
</style>
