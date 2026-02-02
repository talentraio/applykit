<template>
  <div class="resume-settings">
    <!-- Preview Type Toggle -->
    <div class="resume-settings__section">
      <h3 class="resume-settings__title">
        {{ $t('resume.settings.previewType.label') }}
      </h3>
      <p class="resume-settings__description">
        {{ $t('resume.settings.previewType.description') }}
      </p>
      <UButtonGroup class="mt-3">
        <UButton
          :color="previewType === 'ats' ? 'primary' : 'neutral'"
          :variant="previewType === 'ats' ? 'solid' : 'outline'"
          icon="i-lucide-file-text"
          @click="emit('update:previewType', 'ats')"
        >
          {{ $t('resume.settings.previewType.ats') }}
        </UButton>
        <UButton
          :color="previewType === 'human' ? 'primary' : 'neutral'"
          :variant="previewType === 'human' ? 'solid' : 'outline'"
          icon="i-lucide-user"
          @click="emit('update:previewType', 'human')"
        >
          {{ $t('resume.settings.previewType.human') }}
        </UButton>
      </UButtonGroup>
    </div>

    <USeparator />

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
        <!-- Margins -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.margins.label') }}
            <span class="resume-settings__value">{{ localSettings.margins }}mm</span>
          </label>
          <URange v-model="localSettings.margins" :min="10" :max="26" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.margins.hint') }}
          </p>
        </div>

        <!-- Font Size -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.fontSize.label') }}
            <span class="resume-settings__value">{{ localSettings.fontSize }}pt</span>
          </label>
          <URange v-model="localSettings.fontSize" :min="9" :max="13" :step="0.5" />
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
          <URange v-model="localSettings.lineHeight" :min="1.1" :max="1.5" :step="0.05" />
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
          <URange v-model="localSettings.blockSpacing" :min="1" :max="9" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.blockSpacing.hint') }}
          </p>
        </div>
      </div>
    </div>

    <USeparator />

    <!-- Save Settings Button -->
    <div class="resume-settings__actions">
      <UButton
        color="primary"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="!isDirty"
        @click="handleSave"
      >
        {{ $t('resume.settings.save') }}
      </UButton>
      <UButton
        v-if="isDirty"
        variant="ghost"
        color="neutral"
        icon="i-lucide-rotate-ccw"
        @click="handleReset"
      >
        {{ $t('resume.settings.reset') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Settings Component
 *
 * Format settings panel with:
 * - Preview type toggle (ATS/Human)
 * - Margins slider (10-26mm)
 * - Font size slider (9-13pt)
 * - Line height slider (1.1-1.5)
 * - Block spacing slider (1-9)
 *
 * Settings are per preview type (ATS and Human have separate settings).
 *
 * Related: T035 (US3)
 */

import type { ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../../types/preview';

defineOptions({ name: 'ResumeSettings' });

const props = withDefaults(
  defineProps<{
    /**
     * Current preview type
     */
    previewType: PreviewType;
    /**
     * Current format settings
     */
    settings: ResumeFormatSettings;
    /**
     * Whether settings are being saved
     */
    saving?: boolean;
  }>(),
  {
    saving: false
  }
);

const emit = defineEmits<{
  /** Update preview type */
  'update:previewType': [type: PreviewType];
  /** Update settings */
  'update:settings': [settings: ResumeFormatSettings];
  /** Save settings to server */
  save: [];
}>();

// Local copy of settings for editing
const localSettings = reactive<ResumeFormatSettings>({
  margins: props.settings.margins,
  fontSize: props.settings.fontSize,
  lineHeight: props.settings.lineHeight,
  blockSpacing: props.settings.blockSpacing
});

// Track if settings changed
const isDirty = computed(() => {
  return (
    localSettings.margins !== props.settings.margins ||
    localSettings.fontSize !== props.settings.fontSize ||
    localSettings.lineHeight !== props.settings.lineHeight ||
    localSettings.blockSpacing !== props.settings.blockSpacing
  );
});

// Sync local settings when props change (e.g., switching preview type)
watch(
  () => props.settings,
  newSettings => {
    localSettings.margins = newSettings.margins;
    localSettings.fontSize = newSettings.fontSize;
    localSettings.lineHeight = newSettings.lineHeight;
    localSettings.blockSpacing = newSettings.blockSpacing;
  },
  { deep: true }
);

// Emit settings changes for live preview
watch(
  localSettings,
  newSettings => {
    emit('update:settings', { ...newSettings });
  },
  { deep: true }
);

/**
 * Save settings to server
 */
function handleSave() {
  emit('save');
}

/**
 * Reset settings to original values
 */
function handleReset() {
  localSettings.margins = props.settings.margins;
  localSettings.fontSize = props.settings.fontSize;
  localSettings.lineHeight = props.settings.lineHeight;
  localSettings.blockSpacing = props.settings.blockSpacing;
}
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

  &__actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 1rem;
  }
}
</style>
