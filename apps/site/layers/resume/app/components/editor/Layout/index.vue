<template>
  <div class="resume-editor-layout">
    <!-- Header slot -->
    <header v-if="$slots.header" class="resume-editor-layout__header">
      <slot name="header" />
    </header>

    <!-- Main content area -->
    <div class="resume-editor-layout__main">
      <ResumeEditorLayoutLeftColumn
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-dirty="isDirty"
        @undo="emit('undo')"
        @redo="emit('redo')"
        @discard="emit('discard')"
      >
        <slot name="left" />

        <template v-if="$slots['left-actions']" #actions>
          <slot name="left-actions" />
        </template>
      </ResumeEditorLayoutLeftColumn>

      <ResumeEditorLayoutRightColumn
        v-model:preview-type="previewType"
        :preview-content="previewContent"
        :preview-settings="previewSettings"
        :export-settings="exportSettings"
        :photo-url="photoUrl"
      />
    </div>

    <ResumeEditorLayoutMobilePreview
      v-model:preview-type="previewType"
      :preview-content="previewContent"
      :export-settings="exportSettings"
      :photo-url="photoUrl"
    />
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
 *
 * Related: T032 (US3), T052 (US5)
 */

import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { PreviewType } from '@site/resume/app/types/preview';
import ResumeEditorLayoutLeftColumn from './LeftColumn.vue';
import ResumeEditorLayoutMobilePreview from './MobilePreview.vue';
import ResumeEditorLayoutRightColumn from './RightColumn.vue';

type FormatSettingsMap = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

defineOptions({ name: 'ResumeEditorLayout' });

withDefaults(
  defineProps<{
    previewContent?: ResumeContent | null;
    previewSettings?: ResumeFormatSettingsAts | ResumeFormatSettingsHuman;
    exportSettings?: FormatSettingsMap;
    canUndo?: boolean;
    canRedo?: boolean;
    isDirty?: boolean;
  }>(),
  {
    previewContent: null,
    previewSettings: undefined,
    exportSettings: undefined,
    canUndo: false,
    canRedo: false,
    isDirty: false
  }
);

const emit = defineEmits<{
  undo: [];
  redo: [];
  discard: [];
}>();

const previewType = defineModel<PreviewType>('previewType', { required: true });
const { profile } = useProfile();
const photoUrl = computed(() => profile.value?.photoUrl ?? undefined);
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
}
</style>
