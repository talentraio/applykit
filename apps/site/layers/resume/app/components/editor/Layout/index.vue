<template>
  <BaseEditorLayout
    v-model:mode="layoutMode"
    class="resume-editor-layout"
    :mode-options="previewModeOptions"
    :can-undo="canUndo"
    :can-redo="canRedo"
    :is-dirty="isDirty"
    :mobile-preview-title="t('resume.preview.overlayTitle')"
    :mobile-preview-aria-label="t('resume.preview.mobileButton')"
    :mobile-close-label="t('resume.preview.close')"
    @undo="emit('undo')"
    @redo="emit('redo')"
    @discard="emit('discard')"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <template #left>
      <slot name="left" />
    </template>

    <template v-if="$slots['left-actions']" #left-actions>
      <slot name="left-actions" />
    </template>

    <template #right-actions>
      <BaseDownloadPdf
        v-if="previewContent"
        :content="previewContent"
        :settings="exportSettings"
        :photo-url="photoUrl"
        size="sm"
      />
    </template>

    <template #preview>
      <ResumePreview
        v-if="previewContent"
        :content="previewContent"
        :type="previewType"
        :settings="currentPreviewSettings"
        :photo-url="photoUrl"
      />
      <div v-else class="resume-editor-layout__empty">
        <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
        <p class="mt-4 text-muted">{{ t('resume.preview.empty') }}</p>
      </div>
    </template>

    <template #mobile-preview-actions>
      <BaseDownloadPdf
        v-if="previewContent"
        :content="previewContent"
        :settings="exportSettings"
        :photo-url="photoUrl"
      />
    </template>
  </BaseEditorLayout>
</template>

<script setup lang="ts">
import type {
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { BaseEditorLayoutModeOption } from '@site/base/app/components/base/editor-layout/types';
import type { PreviewType } from '@site/resume/app/types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';

type FormatSettingsMap = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

defineOptions({ name: 'ResumeEditorLayout' });

const props = withDefaults(
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
const { t } = useI18n();
const { profile } = useProfile();
const photoUrl = computed(() => profile.value?.photoUrl ?? undefined);

const previewModeOptions = computed<BaseEditorLayoutModeOption[]>(() => [
  {
    value: EXPORT_FORMAT_MAP.ATS,
    label: t('resume.settings.previewType.ats')
  },
  {
    value: EXPORT_FORMAT_MAP.HUMAN,
    label: t('resume.settings.previewType.human')
  }
]);

const isPreviewType = (value: string): value is PreviewType =>
  value === EXPORT_FORMAT_MAP.ATS || value === EXPORT_FORMAT_MAP.HUMAN;

const layoutMode = computed<string>({
  get: () => previewType.value,
  set: value => {
    if (isPreviewType(value)) {
      previewType.value = value;
    }
  }
});

const currentPreviewSettings = computed<
  ResumeFormatSettingsAts | ResumeFormatSettingsHuman | undefined
>(() => {
  if (props.exportSettings) {
    return previewType.value === EXPORT_FORMAT_MAP.ATS
      ? props.exportSettings.ats
      : props.exportSettings.human;
  }

  return props.previewSettings;
});
</script>

<style lang="scss">
.resume-editor-layout {
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
