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
        <div class="resume-editor-layout__left-content">
          <slot name="left" />
        </div>

        <div v-if="$slots['left-actions']" class="resume-editor-layout__left-actions">
          <slot name="left-actions" />
        </div>

        <div v-if="$slots.footer" class="resume-editor-layout__left-footer">
          <slot name="footer" />
        </div>
      </aside>

      <!-- Right column: Preview (60% on desktop, hidden on mobile) -->
      <main class="resume-editor-layout__right">
        <div class="resume-editor-layout__right-header">
          <div class="resume-editor-layout__right-header-left"></div>
          <div class="resume-editor-layout__right-header-center pb-2">
            <PreviewTypeToggle v-model="previewType" />
          </div>
          <div class="resume-editor-layout__right-header-actions">
            <slot name="right-actions" />
          </div>
        </div>

        <div class="resume-editor-layout__right-content">
          <ResumePreview
            v-if="previewContent"
            :content="previewContent"
            :type="previewType"
            :settings="previewSettings"
            :photo-url="photoUrl"
          />
          <div v-else class="resume-editor-layout__preview-empty">
            <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
            <p class="mt-4 text-muted">{{ $t('resume.preview.empty') }}</p>
          </div>
        </div>
      </main>
    </div>

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
 * - header: Top actions
 * - left: Left column content (tabs, form, settings)
 * - left-actions: Left column actions below scroll area
 * - right-actions: Right column header actions (e.g. download button)
 * - footer: Bottom actions (undo/redo controls)
 * - mobile-preview: Float button and overlay for mobile preview (T052)
 *
 * Related: T032 (US3), T052 (US5)
 */

import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { PreviewType } from '@site/resume/app/types/preview';
import PreviewTypeToggle from './PreviewTypeToggle.vue';

defineOptions({ name: 'ResumeEditorLayout' });

withDefaults(
  defineProps<{
    previewContent?: ResumeContent | null;
    previewSettings?: ResumeFormatSettingsAts | ResumeFormatSettingsHuman;
    photoUrl?: string;
  }>(),
  {
    previewContent: null,
    previewSettings: undefined,
    photoUrl: undefined
  }
);

const previewType = defineModel<PreviewType>('previewType', { required: true });
</script>

<style lang="scss">
.resume-editor-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 1920px;
  margin: 0 auto;

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
    min-height: 0;
    overflow: hidden;

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

  &__left-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  &__left-footer {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-top-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }

  &__left-actions {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
  }

  &__right {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    background-color: var(--color-neutral-100);

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutral-900);
    }

    // Mobile: hidden (use float button for preview)
    @media (width <= 1023px) {
      display: none;
    }
  }

  &__right-header {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem 0;
  }

  &__right-header-left {
    min-width: 0;
  }

  &__right-header-center {
    display: flex;
    justify-content: center;
    min-width: 0;
  }

  &__right-header-actions {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }

  &__right-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 0.75rem 1.5rem 1.5rem;
  }

  &__preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
}
</style>
