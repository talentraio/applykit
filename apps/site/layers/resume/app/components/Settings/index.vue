<template>
  <div class="resume-settings">
    <div v-if="resumeId" class="resume-settings__section">
      <h3 class="resume-settings__title">
        {{ $t('resume.settings.resumeName') }}
      </h3>

      <div class="resume-settings__name-control">
        <UInput
          v-model="resumeNameValue"
          :placeholder="$t('resume.settings.resumeNamePlaceholder')"
          :disabled="isNameSaving"
          :maxlength="255"
        />
      </div>
    </div>

    <!-- Format Settings -->
    <div class="resume-settings__section">
      <h3 class="resume-settings__title">
        {{ $t('resume.settings.format.label') }}
      </h3>
      <p class="resume-settings__description">
        {{
          previewType === atsFormat
            ? $t('resume.settings.format.descriptionAts')
            : $t('resume.settings.format.descriptionHuman')
        }}
      </p>

      <div class="mt-4 space-y-4">
        <!-- Horizontal Margins (left/right) -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.marginX.label') }}
            <span class="resume-settings__value">{{ marginX }}mm</span>
          </label>
          <USlider v-model="marginX" :min="10" :max="26" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.marginX.hint') }}
          </p>
        </div>

        <!-- Vertical Margins (top/bottom) -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.marginY.label') }}
            <span class="resume-settings__value">{{ marginY }}mm</span>
          </label>
          <USlider v-model="marginY" :min="10" :max="26" :step="1" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.marginY.hint') }}
          </p>
        </div>

        <!-- Font Size -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.fontSize.label') }}
            <span class="resume-settings__value">{{ fontSize }}pt</span>
          </label>
          <USlider v-model="fontSize" :min="9" :max="13" :step="0.5" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.fontSize.hint') }}
          </p>
        </div>

        <!-- Line Height -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.lineHeight.label') }}
            <span class="resume-settings__value">{{ lineHeight.toFixed(1) }}</span>
          </label>
          <USlider v-model="lineHeight" :min="1.1" :max="1.5" :step="0.05" />
          <p class="resume-settings__hint">
            {{ $t('resume.settings.lineHeight.hint') }}
          </p>
        </div>

        <!-- Block Spacing -->
        <div class="resume-settings__control">
          <label class="resume-settings__label">
            {{ $t('resume.settings.blockSpacing.label') }}
            <span class="resume-settings__value">{{ blockSpacing }}</span>
          </label>
          <USlider v-model="blockSpacing" :min="1" :max="9" :step="1" />
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

import type { SpacingSettings } from '@int/schema';
import type { PreviewType } from '../../types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'ResumeSettings' });

const props = defineProps<{
  /**
   * Current preview type
   */
  previewType: PreviewType;
  /**
   * Active resume ID for name updates
   */
  resumeId?: string;
  /**
   * Active resume name
   */
  resumeName?: string | null;
  /**
   * Current spacing settings
   */
  settings: SpacingSettings;
}>();

const emit = defineEmits<{
  /** Update settings (triggers auto-save in parent) */
  'update:settings': [settings: SpacingSettings];
}>();

const atsFormat = EXPORT_FORMAT_MAP.ATS;
const { t } = useI18n();
const toast = useToast();
const resumeStore = useResumeStore();
const isNameSaving = ref(false);
const resumeNameValue = ref('');

watch(
  () => props.resumeName,
  value => {
    const normalized = value ?? '';
    if (normalized !== resumeNameValue.value) {
      resumeNameValue.value = normalized;
    }
  },
  { immediate: true }
);

const saveResumeName = useDebounceFn(async (name: string) => {
  if (!props.resumeId) return;

  const normalized = name.trim();
  if (!normalized) return;

  const current = (props.resumeName ?? '').trim();
  if (normalized === current) return;

  isNameSaving.value = true;

  try {
    await resumeStore.updateResumeName(props.resumeId, normalized);
  } catch (error) {
    toast.add({
      title: t('resume.error.updateFailed'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    isNameSaving.value = false;
  }
}, 600);

watch(resumeNameValue, value => {
  void saveResumeName(value);
});

const updateSpacing = (partial: Partial<SpacingSettings>) => {
  emit('update:settings', {
    ...props.settings,
    ...partial
  });
};

const marginX = computed({
  get: (): number => props.settings.marginX,
  set: (value: number) => updateSpacing({ marginX: value })
});

const marginY = computed({
  get: (): number => props.settings.marginY,
  set: (value: number) => updateSpacing({ marginY: value })
});

const fontSize = computed({
  get: (): number => props.settings.fontSize,
  set: (value: number) => updateSpacing({ fontSize: value })
});

const lineHeight = computed({
  get: (): number => props.settings.lineHeight,
  set: (value: number) => updateSpacing({ lineHeight: value })
});

const blockSpacing = computed({
  get: (): number => props.settings.blockSpacing,
  set: (value: number) => updateSpacing({ blockSpacing: value })
});
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

  &__name-control {
    margin-top: 0.75rem;
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
