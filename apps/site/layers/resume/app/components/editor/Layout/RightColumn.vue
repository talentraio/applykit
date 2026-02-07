<template>
  <main class="resume-editor-layout-right-column">
    <div class="resume-editor-layout-right-column__header">
      <div class="resume-editor-layout-right-column__header-left"></div>
      <div class="resume-editor-layout-right-column__header-center pb-2">
        <PreviewTypeToggle v-model="previewType" />
      </div>
      <div class="resume-editor-layout-right-column__header-actions">
        <BaseDownloadPdf
          v-if="previewContent"
          :content="previewContent"
          :settings="exportSettings"
          :photo-url="photoUrl"
          size="sm"
        />
      </div>
    </div>

    <div class="resume-editor-layout-right-column__content">
      <ResumePreview
        v-if="previewContent"
        :content="previewContent"
        :type="previewType"
        :settings="previewSettings"
        :photo-url="photoUrl"
      />
      <div v-else class="resume-editor-layout-right-column__empty">
        <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
        <p class="mt-4 text-muted">{{ $t('resume.preview.empty') }}</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { PreviewType } from '@site/resume/app/types/preview';
import PreviewTypeToggle from './PreviewTypeToggle.vue';

type FormatSettingsMap = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

defineOptions({ name: 'ResumeEditorLayoutRightColumn' });

withDefaults(
  defineProps<{
    previewContent?: ResumeContent | null;
    previewSettings?: ResumeFormatSettingsAts | ResumeFormatSettingsHuman;
    exportSettings?: FormatSettingsMap;
    photoUrl?: string;
  }>(),
  {
    previewContent: null,
    previewSettings: undefined,
    exportSettings: undefined,
    photoUrl: undefined
  }
);

const previewType = defineModel<PreviewType>('previewType', { required: true });
</script>

<style lang="scss">
.resume-editor-layout-right-column {
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

  &__header {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem 0;
  }

  &__header-left {
    min-width: 0;
  }

  &__header-center {
    display: flex;
    justify-content: center;
    min-width: 0;
  }

  &__header-actions {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }

  &__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 0.75rem 1.5rem 1.5rem;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
}
</style>
