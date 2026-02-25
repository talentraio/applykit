<template>
  <div
    class="vacancy-item-cover-left-formatting vacancy-cover-page__tab-content vacancy-cover-page__tab-content--formatting"
  >
    <div class="vacancy-cover-page__formatting-settings">
      <h3 class="vacancy-cover-page__section-title">
        {{ t('vacancy.cover.formatTitle') }}
      </h3>

      <p class="vacancy-cover-page__section-description">
        {{ t('vacancy.cover.formatDescription') }}
      </p>

      <div class="vacancy-cover-page__controls">
        <div
          v-for="control in formattingControls"
          :key="control.key"
          class="vacancy-cover-page__control"
        >
          <label class="vacancy-cover-page__label">
            {{ t(control.labelKey) }}
            <span class="vacancy-cover-page__value">{{ formatControlValue(control.key) }}</span>
          </label>

          <USlider
            :model-value="formatSettings[control.key]"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            :disabled="!hasCoverLetter"
            @update:model-value="handleUpdateFormatSetting(control.key, $event)"
          />

          <p class="vacancy-cover-page__hint-text">
            {{ t(control.hintKey) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';

defineOptions({ name: 'VacancyItemCoverLeftFormatting' });

const props = defineProps<{
  formatSettings: SpacingSettings;
}>();

const emit = defineEmits<{
  updateFormatSetting: [key: keyof SpacingSettings, value: number];
}>();

const { t } = useI18n();
const { formatSettings } = toRefs(props);
const vacancyCoverLetterStore = useVacancyCoverLetterStore();
const { getHasPersistedCoverLetter } = storeToRefs(vacancyCoverLetterStore);
const hasCoverLetter = computed(() => getHasPersistedCoverLetter.value);

type FormattingControlKey = keyof SpacingSettings;

type FormattingControl = {
  key: FormattingControlKey;
  labelKey: string;
  hintKey: string;
  min: number;
  max: number;
  step: number;
};

type FormattingControlLimits = {
  min: number;
  max: number;
  round?: boolean;
  precision?: number;
};

const formatSettingLimits: Record<FormattingControlKey, FormattingControlLimits> = {
  marginX: { min: 10, max: 26 },
  marginY: { min: 10, max: 26 },
  fontSize: { min: 10, max: 14, precision: 1 },
  lineHeight: { min: 1.1, max: 1.5, precision: 2 },
  blockSpacing: { min: 1, max: 9, round: true }
};

const formattingControls: readonly FormattingControl[] = [
  {
    key: 'marginX',
    labelKey: 'resume.settings.marginX.label',
    hintKey: 'resume.settings.marginX.hint',
    min: 10,
    max: 26,
    step: 1
  },
  {
    key: 'marginY',
    labelKey: 'resume.settings.marginY.label',
    hintKey: 'resume.settings.marginY.hint',
    min: 10,
    max: 26,
    step: 1
  },
  {
    key: 'fontSize',
    labelKey: 'resume.settings.fontSize.label',
    hintKey: 'vacancy.cover.fontSizeHint',
    min: 10,
    max: 14,
    step: 0.5
  },
  {
    key: 'lineHeight',
    labelKey: 'resume.settings.lineHeight.label',
    hintKey: 'vacancy.cover.lineHeightHint',
    min: 1.1,
    max: 1.5,
    step: 0.05
  },
  {
    key: 'blockSpacing',
    labelKey: 'vacancy.cover.paragraphSpacingLabel',
    hintKey: 'vacancy.cover.paragraphSpacingHint',
    min: 1,
    max: 9,
    step: 1
  }
] as const;

const formatControlValue = (key: FormattingControlKey): string => {
  const value = formatSettings.value[key];

  if (key === 'marginX' || key === 'marginY') {
    return `${value}mm`;
  }

  if (key === 'fontSize') {
    return `${value}pt`;
  }

  if (key === 'lineHeight') {
    return value.toFixed(2);
  }

  return `${value}`;
};

const toSliderNumber = (value: number | number[] | undefined): number | null => {
  if (typeof value === 'undefined') return null;

  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

const normalizeFormatSettingValue = (key: FormattingControlKey, value: number): number => {
  const limits = formatSettingLimits[key];
  const clampedValue = Math.min(limits.max, Math.max(limits.min, value));

  if (limits.round) {
    return Math.round(clampedValue);
  }

  if (typeof limits.precision === 'number') {
    return Number(clampedValue.toFixed(limits.precision));
  }

  return clampedValue;
};

const handleUpdateFormatSetting = (
  key: FormattingControlKey,
  value: number | number[] | undefined
): void => {
  if (!hasCoverLetter.value) return;

  const sliderValue = toSliderNumber(value);
  if (sliderValue === null || !Number.isFinite(sliderValue)) return;

  emit('updateFormatSetting', key, normalizeFormatSettingValue(key, sliderValue));
};
</script>

<style lang="scss">
.vacancy-item-cover-left-formatting {
  &.vacancy-cover-page__tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0;
  }
}

.vacancy-cover-page {
  &__section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  &__section-description {
    font-size: 0.875rem;
    color: var(--color-neutral-500);
  }

  &__controls {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  &__value {
    color: var(--color-primary-500);
    font-weight: 600;
  }

  &__hint-text {
    font-size: 0.75rem;
    color: var(--color-neutral-400);
  }
}
</style>
