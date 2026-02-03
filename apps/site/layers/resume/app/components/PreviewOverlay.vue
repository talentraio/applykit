<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('resume.preview.overlayTitle')"
    fullscreen
    :ui="{
      content: 'flex flex-col h-full',
      body: 'flex-1 overflow-hidden p-0'
    }"
  >
    <template #body>
      <div class="preview-overlay">
        <!-- Header with preview type toggle -->
        <div class="preview-overlay__header">
          <UFieldGroup size="sm">
            <UButton
              :color="previewType === 'ats' ? 'primary' : 'neutral'"
              :variant="previewType === 'ats' ? 'solid' : 'outline'"
              @click="$emit('update:preview-type', 'ats')"
            >
              {{ $t('resume.settings.previewType.ats') }}
            </UButton>
            <UButton
              :color="previewType === 'human' ? 'primary' : 'neutral'"
              :variant="previewType === 'human' ? 'solid' : 'outline'"
              @click="$emit('update:preview-type', 'human')"
            >
              {{ $t('resume.settings.previewType.human') }}
            </UButton>
          </UFieldGroup>
        </div>

        <!-- Preview content area with scrolling -->
        <div class="preview-overlay__content">
          <ResumePreview
            v-if="content"
            :content="content"
            :type="previewType"
            :settings="resolvedSettings"
            :photo-url="photoUrl"
          />
          <div v-else class="preview-overlay__empty">
            <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
            <p class="mt-4 text-muted">{{ $t('resume.preview.empty') }}</p>
          </div>
        </div>

        <!-- Footer with download and close buttons -->
        <div class="preview-overlay__footer">
          <UButton variant="ghost" color="neutral" icon="i-lucide-x" @click="isOpen = false">
            {{ $t('resume.preview.close') }}
          </UButton>
          <BaseDownloadPdf
            v-if="showDownload && content"
            :content="content"
            :settings="settings"
            :photo-url="photoUrl"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Preview Overlay Component
 *
 * Full-screen preview modal for mobile devices.
 * Shows A4 preview with Download and Close buttons.
 *
 * Features:
 * - Full-screen modal overlay
 * - Preview type toggle (ATS/Human)
 * - Scrollable preview content
 * - Download PDF options
 * - Close button
 *
 * Related: T051 (US5)
 */

import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../types/preview';

defineOptions({ name: 'ResumePreviewOverlay' });

const props = withDefaults(
  defineProps<{
    /**
     * Controls overlay visibility
     */
    open: boolean;
    /**
     * Resume content to display
     */
    content: ResumeContent | null;
    /**
     * Current preview type
     * @default 'ats'
     */
    previewType?: PreviewType;
    /**
     * Format settings (single or per-format)
     */
    settings?: FormatSettings;
    /**
     * Profile photo URL for human view
     */
    photoUrl?: string;
    /**
     * Show download button
     * @default true
     */
    showDownload?: boolean;
  }>(),
  {
    previewType: 'ats',
    settings: () => ({}),
    showDownload: true
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:preview-type': [type: PreviewType];
}>();

type FormatSettingsMap = {
  ats: Partial<ResumeFormatSettings>;
  human: Partial<ResumeFormatSettings>;
};

type FormatSettings = Partial<ResumeFormatSettings> | FormatSettingsMap;

const isFormatSettingsMap = (value: FormatSettings): value is FormatSettingsMap => {
  return typeof value === 'object' && value !== null && 'ats' in value && 'human' in value;
};

// Two-way binding for open state
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
});

const resolvedSettings = computed<Partial<ResumeFormatSettings>>(() => {
  if (!props.settings) return {};
  if (isFormatSettingsMap(props.settings)) {
    return props.previewType === 'ats' ? props.settings.ats : props.settings.human;
  }
  return props.settings;
});
</script>

<style lang="scss">
.preview-overlay {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-neutral-100);

  @media (prefers-color-scheme: dark) {
    background-color: var(--color-neutral-900);
  }

  &__header {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-bottom-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-top: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-top-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }
}
</style>
