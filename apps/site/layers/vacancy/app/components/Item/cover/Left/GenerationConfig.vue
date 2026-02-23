<template>
  <div
    class="vacancy-item-cover-left-generation-config vacancy-cover-page__tab-content vacancy-cover-page__tab-content--inputs"
  >
    <div class="vacancy-cover-page__inputs-form">
      <UFormField :label="t('vacancy.cover.language.label')">
        <USelectMenu
          v-model="language"
          :items="languageItems"
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
          :placeholder="t('vacancy.cover.instructionsPlaceholder')"
        />
      </UFormField>

      <UButton
        block
        :loading="coverLetterGenerating"
        :disabled="!hasGeneration || Boolean(characterLimitValidationError)"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoverLetterLengthPreset } from '@int/schema';
import {
  COVER_LETTER_CHARACTER_LIMIT_DEFAULTS,
  COVER_LETTER_LENGTH_PRESET_MAP,
  COVER_LETTER_LOCALE_MAP,
  COVER_LETTER_TONE_MAP,
  COVER_LETTER_TYPE_MAP
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
const vacancyId = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
});

const language = computed({
  get: () => getCoverLetter.value?.language ?? COVER_LETTER_LOCALE_MAP.EN,
  set: value => vacancyCoverLetterStore.updateCurrentLanguage(value)
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

const instructions = computed({
  get: () => getCoverLetter.value?.instructions ?? '',
  set: value => vacancyCoverLetterStore.updateCurrentInstructions(value)
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

const languageItems = computed(() => [
  { label: t('vacancy.cover.language.en'), value: COVER_LETTER_LOCALE_MAP.EN },
  { label: t('vacancy.cover.language.da-DK'), value: COVER_LETTER_LOCALE_MAP.DA_DK }
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
}
</style>
