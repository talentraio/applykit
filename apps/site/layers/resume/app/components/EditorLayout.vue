<template>
  <div class="resume-editor-layout">
    <!-- Header slot -->
    <header v-if="$slots.header" class="resume-editor-layout__header">
      <slot name="header" />
    </header>

    <!-- Main content area -->
    <div class="resume-editor-layout__main">
      <!-- Left column: Editor/Settings tabs (40% on desktop) -->
      <aside class="resume-editor-layout__left">
        <slot name="left" />
      </aside>

      <!-- Right column: Preview (60% on desktop, hidden on mobile) -->
      <main class="resume-editor-layout__right">
        <slot name="right" />
      </main>
    </div>

    <!-- Footer slot (undo/redo controls) -->
    <footer v-if="$slots.footer" class="resume-editor-layout__footer">
      <slot name="footer" />
    </footer>

    <!-- Mobile preview float button slot (visible only on mobile <1024px) -->
    <slot name="mobile-preview" />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Editor Layout Component
 *
 * Two-column layout for resume editing:
 * - Left column (40%): Editor tabs (Content, Settings, AI Enhance)
 * - Right column (60%): A4 Preview
 *
 * Desktop: Side-by-side layout
 * Mobile: Single column (preview hidden, accessible via float button)
 *
 * Slots:
 * - header: Top actions (Upload new, Download dropdown)
 * - left: Left column content (tabs, form, settings)
 * - right: Right column content (A4 preview)
 * - footer: Bottom actions (undo/redo controls)
 * - mobile-preview: Float button and overlay for mobile preview (T052)
 *
 * Related: T032 (US3), T052 (US5)
 */

defineOptions({ name: 'ResumeEditorLayout' });
</script>

<style lang="scss">
.resume-editor-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__header {
    flex-shrink: 0;
    padding: 1rem;
    border-bottom: 1px solid var(--color-neutral-200);

    @media (prefers-color-scheme: dark) {
      border-bottom-color: var(--color-neutral-800);
    }
  }

  &__main {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;

    // Mobile: single column
    @media (width <= 1023px) {
      flex-direction: column;
    }
  }

  &__left {
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    // Desktop: 40% width
    @media (width >= 1024px) {
      width: 40%;
      min-width: 360px;
      max-width: 480px;
      border-right: 1px solid var(--color-neutral-200);

      @media (prefers-color-scheme: dark) {
        border-right-color: var(--color-neutral-800);
      }
    }

    // Mobile: full width
    @media (width <= 1023px) {
      flex: 1;
      width: 100%;
    }
  }

  &__right {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background-color: var(--color-neutral-100);
    padding: 1.5rem;

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutral-900);
    }

    // Mobile: hidden (use float button for preview)
    @media (width <= 1023px) {
      display: none;
    }
  }

  &__footer {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-top-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }
}
</style>
