<template>
  <div class="resume-editor-layout-mobile-preview">
    <ResumePreviewFloatButton @click="isMobilePreviewOpen = true" />
    <ResumePreviewOverlay
      v-model:open="isMobilePreviewOpen"
      v-model:preview-type="previewType"
      :content="previewContent"
      :settings="exportSettings"
      :photo-url="photoUrl"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { PreviewType } from '@site/resume/app/types/preview';

type FormatSettingsMap = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

defineOptions({ name: 'ResumeEditorLayoutMobilePreview' });

withDefaults(
  defineProps<{
    previewContent?: ResumeContent | null;
    exportSettings?: FormatSettingsMap;
    photoUrl?: string;
  }>(),
  {
    previewContent: null,
    exportSettings: undefined,
    photoUrl: undefined
  }
);

const previewType = defineModel<PreviewType>('previewType', { required: true });
const isMobilePreviewOpen = ref(false);
</script>
