<template>
  <div class="resume-preview">
    <!-- A4 Paper Preview with selected view type -->
    <ResumePaperSheet
      :padding-mm="settings.margins"
      :font-size="settings.fontSize"
      :line-height="settings.lineHeight"
    >
      <!-- ATS View -->
      <ResumePreviewAtsView v-if="type === 'ats'" :content="content" />

      <!-- Human View -->
      <ResumePreviewHumanView v-else :content="content" :photo-url="photoUrl" />
    </ResumePaperSheet>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview Component
 *
 * Orchestrates A4 preview with zoom scaling and view type selection.
 * Renders content in PaperSheet with either ATS or Human view.
 *
 * Features:
 * - A4 paper dimensions with zoom scaling
 * - ATS view: plain text for machine parsing
 * - Human view: styled layout for readability
 * - Configurable margins, font size, line height
 *
 * Related: T025 (US2)
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../../types/preview';

defineOptions({ name: 'ResumePreview' });

const props = withDefaults(
  defineProps<{
    /**
     * Resume content to display
     */
    content: ResumeContent;
    /**
     * Preview type: 'ats' or 'human'
     * @default 'ats'
     */
    type?: PreviewType;
    /**
     * Format settings (margins, fontSize, lineHeight, blockSpacing)
     */
    settings?: Partial<ResumeFormatSettings>;
    /**
     * Profile photo URL for human view
     */
    photoUrl?: string;
  }>(),
  {
    type: 'ats',
    settings: () => ({})
  }
);

// Merge with defaults
const settings = computed<ResumeFormatSettings>(() => ({
  margins: props.settings?.margins ?? 20,
  fontSize: props.settings?.fontSize ?? 12,
  lineHeight: props.settings?.lineHeight ?? 1.2,
  blockSpacing: props.settings?.blockSpacing ?? 5
}));
</script>

<style lang="scss">
.resume-preview {
  width: 100%;
}
</style>
