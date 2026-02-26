<template>
  <div
    class="vacancy-item-cover-left-generation-config vacancy-cover-page__tab-content vacancy-cover-page__tab-content--inputs"
  >
    <div class="vacancy-cover-page__inputs-form">
      <UFormField :label="t('vacancy.cover.localeProfile.label')">
        <USelectMenu
          v-model="localeProfile"
          :items="localeProfileItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField v-if="showQualityModeSelector" :label="t('vacancy.cover.quality.label')">
        <template #hint>
          <UPopover
            :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
            :ui="{ content: 'vacancy-cover-page__quality-hint-popover' }"
          >
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-circle-help"
              class="vacancy-cover-page__quality-hint-trigger"
              :aria-label="t('vacancy.cover.quality.hint.ariaLabel')"
              :title="t('vacancy.cover.quality.hint.ariaLabel')"
            />

            <template #content>
              <div class="vacancy-cover-page__quality-hint-tooltip">
                <p class="vacancy-cover-page__quality-hint-line">
                  {{ t('vacancy.cover.quality.hint.draft') }}
                </p>
                <p class="vacancy-cover-page__quality-hint-line">
                  {{ t('vacancy.cover.quality.hint.high') }}
                </p>
                <p class="vacancy-cover-page__quality-hint-warning">
                  {{ t('vacancy.cover.quality.hint.warning') }}
                </p>
              </div>
            </template>
          </UPopover>
        </template>

        <USelectMenu
          v-model="qualityMode"
          :items="qualityModeItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="showGrammaticalGenderField"
        :label="t('vacancy.cover.grammaticalGender.label')"
      >
        <USelectMenu
          v-model="grammaticalGender"
          :items="grammaticalGenderItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('vacancy.cover.type.label')">
        <USelectMenu
          v-model="type"
          :items="typeItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('vacancy.cover.tone.label')">
        <USelectMenu
          v-model="tone"
          :items="toneItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('vacancy.cover.length.label')">
        <USelectMenu
          v-model="lengthPreset"
          :items="lengthItems"
          value-key="value"
          :search-input="false"
          class="w-full"
        />
      </UFormField>

      <UFormField v-if="showCharacterLimitInput" :label="characterLimitLabel">
        <UInput
          v-model="characterLimitInput"
          type="number"
          :min="minCharacterLimit"
          :max="maxCharacterLimit"
          step="1"
          class="w-full"
          :placeholder="characterLimitPlaceholder"
        />

        <p class="vacancy-cover-page__character-limit-hint">
          {{ characterLimitHint }}
        </p>
        <p v-if="characterLimitValidationError" class="vacancy-cover-page__character-limit-error">
          {{ characterLimitValidationError }}
        </p>
      </UFormField>

      <UFormField :label="t('vacancy.cover.recipientName')">
        <UInput
          v-model="recipientName"
          class="w-full"
          :placeholder="t('vacancy.cover.recipientNamePlaceholder')"
        />
      </UFormField>

      <UFormField v-if="type === 'message'" :label="t('vacancy.cover.subject')">
        <UCheckbox v-model="includeSubjectLine" :label="t('vacancy.cover.includeSubjectLine')" />
      </UFormField>

      <UFormField :label="t('vacancy.cover.instructions')">
        <UTextarea
          v-model="instructions"
          class="w-full"
          :rows="6"
          autoresize
          :maxlength="additionalInstructionsMaxCharacters"
          :placeholder="t('vacancy.cover.instructionsPlaceholder')"
        />

        <p class="vacancy-cover-page__instructions-counter">
          {{ instructionsCharacterCount }}/{{ additionalInstructionsMaxCharacters }}
        </p>
      </UFormField>

      <UButton
        block
        :loading="coverLetterGenerating"
        :disabled="
          !hasGeneration || !coverLetterFlowAvailable || Boolean(characterLimitValidationError)
        "
        icon="i-lucide-sparkles"
        @click="emit('generate')"
      >
        {{ hasCoverLetter ? t('vacancy.cover.regenerate') : t('vacancy.cover.generate') }}
      </UButton>

      <div v-if="!hasGeneration" class="vacancy-cover-page__hint">
        <p>{{ t('vacancy.cover.generateResumeFirst') }}</p>

        <UButton
          variant="ghost"
          icon="i-lucide-arrow-left"
          :to="`/vacancies/${vacancyId}/overview`"
        >
          {{ t('vacancy.cover.backToOverview') }}
        </UButton>
      </div>

      <div v-if="!coverLetterFlowAvailable" class="vacancy-cover-page__hint">
        <p>{{ t('vacancy.cover.flowDisabledHint') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CoverLetterLengthPreset,
  CoverLetterQualityMode,
  GrammaticalGender
} from '@int/schema';
import {
  COVER_LETTER_CHARACTER_LIMIT_DEFAULTS,
  COVER_LETTER_LENGTH_PRESET_MAP,
  COVER_LETTER_LOCALE_MAP,
  COVER_LETTER_MARKET_MAP,
  COVER_LETTER_QUALITY_MODE_MAP,
  COVER_LETTER_TONE_MAP,
  COVER_LETTER_TYPE_MAP,
  GRAMMATICAL_GENDER_MAP,
  localeRequiresGrammaticalGender
} from '@int/schema';

defineOptions({ name: 'VacancyItemCoverLeftGenerationConfig' });

const emit = defineEmits<{
  generate: [];
}>();

const route = useRoute();
const vacancyStore = useVacancyStore();
const vacancyCoverLetterStore = useVacancyCoverLetterStore();
const runtimeConfig = useRuntimeConfig();
const { t } = useI18n();
const { getCurrentVacancyMeta } = storeToRefs(vacancyStore);
const { getCoverLetter, getCoverLetterGenerating, getHasPersistedCoverLetter } =
  storeToRefs(vacancyCoverLetterStore);

const hasGeneration = computed(() => Boolean(getCurrentVacancyMeta.value?.latestGenerationId));
const hasCoverLetter = computed(() => getHasPersistedCoverLetter.value);
const coverLetterGenerating = computed(() => getCoverLetterGenerating.value);
const coverLetterDraftEnabled = computed(
  () => getCurrentVacancyMeta.value?.coverLetterDraftEnabled ?? true
);
const coverLetterHighEnabled = computed(
  () => getCurrentVacancyMeta.value?.coverLetterHighEnabled ?? true
);
const coverLetterFlowAvailable = computed(() => {
  return coverLetterDraftEnabled.value || coverLetterHighEnabled.value;
});
const vacancyId = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
});

const language = computed({
  get: () => getCoverLetter.value?.language ?? COVER_LETTER_LOCALE_MAP.EN,
  set: value => vacancyCoverLetterStore.updateCurrentLanguage(value)
});

const market = computed({
  get: () => getCoverLetter.value?.market ?? COVER_LETTER_MARKET_MAP.DEFAULT,
  set: value => vacancyCoverLetterStore.updateCurrentMarket(value)
});

const COVER_LETTER_LOCALE_PROFILE_MAP = {
  GENERAL_EN: 'general_en',
  DENMARK_EN: 'denmark_en',
  DENMARK_DA: 'denmark_da',
  UKRAINE_UK: 'ukraine_uk',
  UKRAINE_EN: 'ukraine_en'
} as const;

type CoverLetterLocaleProfile =
  (typeof COVER_LETTER_LOCALE_PROFILE_MAP)[keyof typeof COVER_LETTER_LOCALE_PROFILE_MAP];

const resolveProfileFromSettings = (
  languageValue: (typeof COVER_LETTER_LOCALE_MAP)[keyof typeof COVER_LETTER_LOCALE_MAP],
  marketValue: (typeof COVER_LETTER_MARKET_MAP)[keyof typeof COVER_LETTER_MARKET_MAP]
): CoverLetterLocaleProfile => {
  if (
    marketValue === COVER_LETTER_MARKET_MAP.DK &&
    languageValue === COVER_LETTER_LOCALE_MAP.DA_DK
  ) {
    return COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_DA;
  }

  if (marketValue === COVER_LETTER_MARKET_MAP.DK && languageValue === COVER_LETTER_LOCALE_MAP.EN) {
    return COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_EN;
  }

  if (
    marketValue === COVER_LETTER_MARKET_MAP.UA &&
    languageValue === COVER_LETTER_LOCALE_MAP.UK_UA
  ) {
    return COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_UK;
  }

  if (marketValue === COVER_LETTER_MARKET_MAP.UA && languageValue === COVER_LETTER_LOCALE_MAP.EN) {
    return COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_EN;
  }

  return COVER_LETTER_LOCALE_PROFILE_MAP.GENERAL_EN;
};

const applyProfileToSettings = (profile: CoverLetterLocaleProfile): void => {
  switch (profile) {
    case COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_DA:
      language.value = COVER_LETTER_LOCALE_MAP.DA_DK;
      market.value = COVER_LETTER_MARKET_MAP.DK;
      return;
    case COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_EN:
      language.value = COVER_LETTER_LOCALE_MAP.EN;
      market.value = COVER_LETTER_MARKET_MAP.DK;
      return;
    case COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_UK:
      language.value = COVER_LETTER_LOCALE_MAP.UK_UA;
      market.value = COVER_LETTER_MARKET_MAP.UA;
      return;
    case COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_EN:
      language.value = COVER_LETTER_LOCALE_MAP.EN;
      market.value = COVER_LETTER_MARKET_MAP.UA;
      return;
    case COVER_LETTER_LOCALE_PROFILE_MAP.GENERAL_EN:
    default:
      language.value = COVER_LETTER_LOCALE_MAP.EN;
      market.value = COVER_LETTER_MARKET_MAP.DEFAULT;
  }
};

const localeProfile = computed<CoverLetterLocaleProfile>({
  get: () => resolveProfileFromSettings(language.value, market.value),
  set: value => applyProfileToSettings(value)
});

const grammaticalGender = computed<GrammaticalGender>({
  get: () => getCoverLetter.value?.grammaticalGender ?? GRAMMATICAL_GENDER_MAP.NEUTRAL,
  set: value => vacancyCoverLetterStore.updateCurrentGrammaticalGender(value)
});

const qualityMode = computed<CoverLetterQualityMode>({
  get: () => getCoverLetter.value?.qualityMode ?? COVER_LETTER_QUALITY_MODE_MAP.HIGH,
  set: value => vacancyCoverLetterStore.updateCurrentQualityMode(value)
});

const type = computed({
  get: () => getCoverLetter.value?.type ?? COVER_LETTER_TYPE_MAP.LETTER,
  set: value => vacancyCoverLetterStore.updateCurrentType(value)
});

const tone = computed({
  get: () => getCoverLetter.value?.tone ?? COVER_LETTER_TONE_MAP.PROFESSIONAL,
  set: value => vacancyCoverLetterStore.updateCurrentTone(value)
});

const lengthPreset = computed({
  get: () => getCoverLetter.value?.lengthPreset ?? COVER_LETTER_LENGTH_PRESET_MAP.STANDARD,
  set: value => vacancyCoverLetterStore.updateCurrentLengthPreset(value)
});

const characterLimit = computed({
  get: () => getCoverLetter.value?.characterLimit ?? null,
  set: value => vacancyCoverLetterStore.updateCurrentCharacterLimit(value)
});

const characterLimitInput = computed<string | number>({
  get: () => (characterLimit.value === null ? '' : characterLimit.value),
  set: value => {
    const rawValue =
      typeof value === 'number' ? (Number.isFinite(value) ? String(Math.trunc(value)) : '') : value;

    const normalized = rawValue.replace(/\D+/g, '');
    if (normalized.length === 0) {
      characterLimit.value = null;
      return;
    }

    const parsed = Number.parseInt(normalized, 10);
    if (Number.isNaN(parsed)) {
      characterLimit.value = null;
      return;
    }

    characterLimit.value = parsed;
  }
});

const recipientName = computed({
  get: () => getCoverLetter.value?.recipientName ?? '',
  set: value => vacancyCoverLetterStore.updateCurrentRecipientName(value)
});

const includeSubjectLine = computed({
  get: () => getCoverLetter.value?.includeSubjectLine ?? false,
  set: value => vacancyCoverLetterStore.updateCurrentIncludeSubjectLine(value)
});

const additionalInstructionsMaxCharacters = computed(() => {
  const rawValue = runtimeConfig.public?.coverLetter?.additionalInstructionsMaxCharacters;
  const parsed =
    typeof rawValue === 'number'
      ? rawValue
      : Number.parseInt(typeof rawValue === 'string' ? rawValue : String(rawValue ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return 1000;
  }

  return Math.max(1, Math.trunc(parsed));
});

const instructions = computed({
  get: () => getCoverLetter.value?.instructions ?? '',
  set: value =>
    vacancyCoverLetterStore.updateCurrentInstructions(
      value.slice(0, additionalInstructionsMaxCharacters.value)
    )
});

const isCharacterLengthPreset = (value: CoverLetterLengthPreset): boolean => {
  return (
    value === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS ||
    value === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
  );
};

const showCharacterLimitInput = computed(() => {
  return (
    type.value === COVER_LETTER_TYPE_MAP.MESSAGE && isCharacterLengthPreset(lengthPreset.value)
  );
});

const showGrammaticalGenderField = computed(() => {
  return localeRequiresGrammaticalGender(language.value);
});

const showQualityModeSelector = computed(() => {
  return coverLetterDraftEnabled.value && coverLetterHighEnabled.value;
});

watchEffect(() => {
  if (coverLetterDraftEnabled.value && !coverLetterHighEnabled.value) {
    if (qualityMode.value !== COVER_LETTER_QUALITY_MODE_MAP.DRAFT) {
      qualityMode.value = COVER_LETTER_QUALITY_MODE_MAP.DRAFT;
    }
    return;
  }

  if (!coverLetterDraftEnabled.value && coverLetterHighEnabled.value) {
    if (qualityMode.value !== COVER_LETTER_QUALITY_MODE_MAP.HIGH) {
      qualityMode.value = COVER_LETTER_QUALITY_MODE_MAP.HIGH;
    }
  }
});

const toPositiveInteger = (value: unknown, fallback: number): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(parsed));
};

const characterLimitBounds = computed(() => {
  const minConfigured = toPositiveInteger(
    runtimeConfig.public?.coverLetter?.minLengthLimitCharacters,
    COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MIN
  );
  const maxConfigured = toPositiveInteger(
    runtimeConfig.public?.coverLetter?.maxLengthLimitCharacters,
    COVER_LETTER_CHARACTER_LIMIT_DEFAULTS.MAX
  );

  return {
    min: Math.min(minConfigured, maxConfigured),
    max: Math.max(minConfigured, maxConfigured)
  };
});

const minCharacterLimit = computed(() => characterLimitBounds.value.min);
const maxCharacterLimit = computed(() => characterLimitBounds.value.max);
const instructionsCharacterCount = computed(() => instructions.value.length);

const characterLimitHint = computed(() => {
  return t('vacancy.cover.length.charLimitRangeHint', {
    min: minCharacterLimit.value,
    max: maxCharacterLimit.value
  });
});

const characterLimitValidationError = computed<string | null>(() => {
  if (!showCharacterLimitInput.value) {
    return null;
  }

  if (characterLimit.value === null) {
    return t('vacancy.cover.length.charLimitRequired');
  }

  if (characterLimit.value < minCharacterLimit.value) {
    return t('vacancy.cover.length.charLimitMinError', { min: minCharacterLimit.value });
  }

  if (characterLimit.value > maxCharacterLimit.value) {
    return t('vacancy.cover.length.charLimitMaxError', { max: maxCharacterLimit.value });
  }

  return null;
});

const characterLimitLabel = computed(() => {
  return lengthPreset.value === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS
    ? t('vacancy.cover.length.minCharsLabel')
    : t('vacancy.cover.length.maxCharsLabel');
});

const characterLimitPlaceholder = computed(() => {
  return lengthPreset.value === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS
    ? t('vacancy.cover.length.minCharsPlaceholder')
    : t('vacancy.cover.length.maxCharsPlaceholder');
});

const localeProfileItems = computed(() => [
  {
    label: t('vacancy.cover.localeProfile.general.en'),
    value: COVER_LETTER_LOCALE_PROFILE_MAP.GENERAL_EN
  },
  {
    label: t('vacancy.cover.localeProfile.denmark.en'),
    value: COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_EN
  },
  {
    label: t('vacancy.cover.localeProfile.denmark.da-DK'),
    value: COVER_LETTER_LOCALE_PROFILE_MAP.DENMARK_DA
  },
  {
    label: t('vacancy.cover.localeProfile.ukraine.en'),
    value: COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_EN
  },
  {
    label: t('vacancy.cover.localeProfile.ukraine.uk-UA'),
    value: COVER_LETTER_LOCALE_PROFILE_MAP.UKRAINE_UK
  }
]);

const grammaticalGenderItems = computed(() => [
  {
    label: t('vacancy.cover.grammaticalGender.option.masculine'),
    value: GRAMMATICAL_GENDER_MAP.MASCULINE
  },
  {
    label: t('vacancy.cover.grammaticalGender.option.feminine'),
    value: GRAMMATICAL_GENDER_MAP.FEMININE
  },
  {
    label: t('vacancy.cover.grammaticalGender.option.neutral'),
    value: GRAMMATICAL_GENDER_MAP.NEUTRAL
  }
]);

const typeItems = computed(() => [
  { label: t('vacancy.cover.type.letter'), value: COVER_LETTER_TYPE_MAP.LETTER },
  { label: t('vacancy.cover.type.message'), value: COVER_LETTER_TYPE_MAP.MESSAGE }
]);

const toneItems = computed(() => [
  { label: t('vacancy.cover.tone.professional'), value: COVER_LETTER_TONE_MAP.PROFESSIONAL },
  { label: t('vacancy.cover.tone.friendly'), value: COVER_LETTER_TONE_MAP.FRIENDLY },
  { label: t('vacancy.cover.tone.enthusiastic'), value: COVER_LETTER_TONE_MAP.ENTHUSIASTIC },
  { label: t('vacancy.cover.tone.direct'), value: COVER_LETTER_TONE_MAP.DIRECT }
]);

const qualityModeItems = computed(() => [
  { label: t('vacancy.cover.quality.draft'), value: COVER_LETTER_QUALITY_MODE_MAP.DRAFT },
  { label: t('vacancy.cover.quality.high'), value: COVER_LETTER_QUALITY_MODE_MAP.HIGH }
]);

const lengthItems = computed(() => [
  ...[
    { label: t('vacancy.cover.length.short'), value: COVER_LETTER_LENGTH_PRESET_MAP.SHORT },
    { label: t('vacancy.cover.length.standard'), value: COVER_LETTER_LENGTH_PRESET_MAP.STANDARD },
    { label: t('vacancy.cover.length.long'), value: COVER_LETTER_LENGTH_PRESET_MAP.LONG }
  ],
  ...(type.value === COVER_LETTER_TYPE_MAP.MESSAGE
    ? [
        {
          label: t('vacancy.cover.length.moreThanChars'),
          value: COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS
        },
        {
          label: t('vacancy.cover.length.lessThanChars'),
          value: COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
        }
      ]
    : [])
]);
</script>

<style lang="scss">
.vacancy-item-cover-left-generation-config {
  &.vacancy-cover-page__tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0;
  }
}

.vacancy-cover-page {
  &__inputs-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__hint {
    border: 1px dashed var(--ui-border-muted);
    border-radius: 0.5rem;
    padding: 0.75rem;
    color: var(--ui-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__character-limit-hint {
    margin-top: 0.5rem;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  &__character-limit-error {
    margin-top: 0.375rem;
    color: var(--ui-color-error-500);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  &__instructions-counter {
    margin-top: 0.5rem;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    text-align: right;
  }

  &__quality-hint-trigger {
    padding: 0;
    min-height: 1rem;
    min-width: 1rem;
    color: var(--ui-text-muted);
  }

  &__quality-hint-popover {
    z-index: 90;
    max-width: 22rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--ui-border-muted);
    background-color: var(--ui-bg-elevated);
    box-shadow: 0 8px 24px rgb(9 15 42 / 24%);
    white-space: normal;
  }

  &__quality-hint-tooltip {
    display: grid;
    gap: 0.5rem;
  }

  &__quality-hint-line {
    color: var(--ui-text-toned);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  &__quality-hint-warning {
    color: var(--ui-color-warning-500);
    font-size: 0.75rem;
    line-height: 1.4;
    font-weight: 500;
  }
}
</style>
