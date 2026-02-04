<template>
  <div class="resume-settings">
    <!-- Format Settings -->
    <div class="resume-settings__section">
      <h3 class="resume-settings__title">
        {{ $t('resume.settings.format.label') }}
      </h3>
      <p class="resume-settings__description">
        {{
          previewType === 'ats'
            ? $t('resume.settings.format.descriptionAts')
            : $t('resume.settings.format.descriptionHuman')
        }}
      </p>

      <div class="mt-4 space-y-4">
        <!-- Horizontal Margins (left/right) -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.marginX.label') }}
            <span class="resume-settings__value">{{ localSettings.marginX }}mm</span>
          </label>
          <USlider v-model="localSettings.marginX" :min="10" :max="26" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.marginX.hint') }}
          </p>
        </div>

        <!-- Vertical Margins (top/bottom) -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.marginY.label') }}
            <span class="resume-settings__value">{{ localSettings.marginY }}mm</span>
          </label>
          <USlider v-model="localSettings.marginY" :min="10" :max="26" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.marginY.hint') }}
          </p>
        </div>

        <!-- Font Size -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.fontSize.label') }}
            <span class="resume-settings__value">{{ localSettings.fontSize }}pt</span>
          </label>
          <USlider v-model="localSettings.fontSize" :min="9" :max="13" :step="0.5" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.fontSize.hint') }}
          </p>
        </div>

        <!-- Line Height -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.lineHeight.label') }}
            <span class="resume-settings__value">{{ localSettings.lineHeight.toFixed(1) }}</span>
          </label>
          <USlider v-model="localSettings.lineHeight" :min="1.1" :max="1.5" :step="0.05" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.lineHeight.hint') }}
          </p>
        </div>

        <!-- Block Spacing -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.blockSpacing.label') }}
            <span class="resume-settings__value">{{ localSettings.blockSpacing }}</span>
          </label>
          <USlider v-model="localSettings.blockSpacing" :min="1" :max="9" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.blockSpacing.hint') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Settings Component
 *
 * Format settings panel with auto-save:
 * - Horizontal margins slider (10-26mm)
 * - Vertical margins slider (10-26mm)
 * - Font size slider (9-13pt)
 * - Line height slider (1.1-1.5)
 * - Block spacing slider (1-9)
 *
 * Settings are per preview type (ATS and Human have separate settings).
 * Changes are emitted immediately and auto-saved by parent.
 *
 * Related: T035 (US3)
 */

import type { ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../../types/preview';

defineOptions({ name: 'ResumeSettings' });

const props = defineProps<{
  /**
   * Current preview type
   */
  previewType: PreviewType;
  /**
   * Current format settings
   */
  settings: ResumeFormatSettings;
}>();

const emit = defineEmits<{
  /** Update settings (triggers auto-save in parent) */
  'update:settings': [settings: ResumeFormatSettings];
}>();

// Local copy of settings for editing
const localSettings = reactive<ResumeFormatSettings>({
  marginX: props.settings.marginX,
  marginY: props.settings.marginY,
  fontSize: props.settings.fontSize,
  lineHeight: props.settings.lineHeight,
  blockSpacing: props.settings.blockSpacing
});

// Sync local settings when preview type changes (switching between ATS/Human)
watch(
  () => props.previewType,
  () => {
    localSettings.marginX = props.settings.marginX;
    localSettings.marginY = props.settings.marginY;
    localSettings.fontSize = props.settings.fontSize;
    localSettings.lineHeight = props.settings.lineHeight;
    localSettings.blockSpacing = props.settings.blockSpacing;
  }
);

// Emit settings changes for live preview and auto-save
watch(
  localSettings,
  newSettings => {
    emit('update:settings', { ...newSettings });
  },
  { deep: true }
);
</script>

<style lang="scss">
.resume-settings {
  padding: 1rem;

  &__section {
    padding: 1rem 0;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  &__description {
    font-size: 0.875rem;
    color: var(--color-neutral-500);
  }

  &__control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    font-weight: 500;
  }

  &__value {
    font-weight: 600;
    color: var(--color-primary-500);
  }

  &__hint {
    font-size: 0.75rem;
    color: var(--color-neutral-400);
  }
}
</style>
