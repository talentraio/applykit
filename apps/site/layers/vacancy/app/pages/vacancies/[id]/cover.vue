<template>
  <div class="vacancy-cover-page">
    <BasePageLoading v-if="pageLoading" show-text wrapper-class="vacancy-cover-page__loading" />

    <BaseEditorLayout
      v-else
      v-model:mode="layoutMode"
      class="vacancy-cover-page__layout"
      :mode-options="viewModeOptions"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dirty="false"
      :mobile-preview-title="t('vacancy.cover.preview')"
      :mobile-preview-aria-label="t('vacancy.cover.preview')"
      :mobile-close-label="t('resume.preview.close')"
      @undo="undo"
      @redo="redo"
    >
      <template #left>
        <div class="vacancy-cover-page__left-panel">
          <UTabs
            v-model="activeLeftTab"
            :items="leftTabItems"
            :ui="tabsUi"
            class="vacancy-cover-page__tabs"
          >
            <template #content="{ item }">
              <div
                v-if="item.value === inputsTabValue"
                class="vacancy-cover-page__tab-content vacancy-cover-page__tab-content--inputs"
              >
                <div class="vacancy-cover-page__inputs-form">
                  <UFormField :label="t('vacancy.cover.language')">
                    <USelectMenu
                      v-model="generationSettings.language"
                      :items="languageItems"
                      value-key="value"
                      :search-input="false"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="t('vacancy.cover.type')">
                    <USelectMenu
                      v-model="generationSettings.type"
                      :items="typeItems"
                      value-key="value"
                      :search-input="false"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="t('vacancy.cover.tone')">
                    <USelectMenu
                      v-model="generationSettings.tone"
                      :items="toneItems"
                      value-key="value"
                      :search-input="false"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="t('vacancy.cover.length')">
                    <USelectMenu
                      v-model="generationSettings.lengthPreset"
                      :items="lengthItems"
                      value-key="value"
                      :search-input="false"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField :label="t('vacancy.cover.recipientName')">
                    <UInput
                      v-model="generationSettings.recipientName"
                      class="w-full"
                      :placeholder="t('vacancy.cover.recipientNamePlaceholder')"
                    />
                  </UFormField>

                  <UFormField
                    v-if="generationSettings.type === 'message'"
                    :label="t('vacancy.cover.subject')"
                  >
                    <UCheckbox
                      v-model="generationSettings.includeSubjectLine"
                      :label="t('vacancy.cover.includeSubjectLine')"
                    />
                  </UFormField>

                  <UFormField :label="t('vacancy.cover.instructions')">
                    <UTextarea
                      v-model="generationSettings.instructions"
                      class="w-full"
                      :rows="6"
                      autoresize
                      :placeholder="t('vacancy.cover.instructionsPlaceholder')"
                    />
                  </UFormField>

                  <UButton
                    block
                    :loading="coverLetterGenerating"
                    :disabled="!hasGeneration"
                    icon="i-lucide-sparkles"
                    @click="handleGenerate"
                  >
                    {{
                      hasCoverLetter ? t('vacancy.cover.regenerate') : t('vacancy.cover.generate')
                    }}
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

              <div
                v-else
                class="vacancy-cover-page__tab-content vacancy-cover-page__tab-content--format"
              >
                <div class="vacancy-cover-page__format-settings">
                  <h3 class="vacancy-cover-page__section-title">
                    {{ t('vacancy.cover.formatTitle') }}
                  </h3>
                  <p class="vacancy-cover-page__section-description">
                    {{ t('vacancy.cover.formatDescription') }}
                  </p>

                  <div class="vacancy-cover-page__controls">
                    <div class="vacancy-cover-page__control">
                      <label class="vacancy-cover-page__label">
                        {{ t('resume.settings.marginX.label') }}
                        <span class="vacancy-cover-page__value"
                          >{{ formatSettings.marginX }}mm</span
                        >
                      </label>
                      <USlider
                        :model-value="formatSettings.marginX"
                        :min="10"
                        :max="26"
                        :step="1"
                        :disabled="!hasCoverLetter"
                        @update:model-value="value => updateFormatSetting('marginX', value)"
                      />
                      <p class="vacancy-cover-page__hint-text">
                        {{ t('resume.settings.marginX.hint') }}
                      </p>
                    </div>

                    <div class="vacancy-cover-page__control">
                      <label class="vacancy-cover-page__label">
                        {{ t('resume.settings.marginY.label') }}
                        <span class="vacancy-cover-page__value"
                          >{{ formatSettings.marginY }}mm</span
                        >
                      </label>
                      <USlider
                        :model-value="formatSettings.marginY"
                        :min="10"
                        :max="26"
                        :step="1"
                        :disabled="!hasCoverLetter"
                        @update:model-value="value => updateFormatSetting('marginY', value)"
                      />
                      <p class="vacancy-cover-page__hint-text">
                        {{ t('resume.settings.marginY.hint') }}
                      </p>
                    </div>

                    <div class="vacancy-cover-page__control">
                      <label class="vacancy-cover-page__label">
                        {{ t('resume.settings.fontSize.label') }}
                        <span class="vacancy-cover-page__value"
                          >{{ formatSettings.fontSize }}pt</span
                        >
                      </label>
                      <USlider
                        :model-value="formatSettings.fontSize"
                        :min="10"
                        :max="14"
                        :step="0.5"
                        :disabled="!hasCoverLetter"
                        @update:model-value="value => updateFormatSetting('fontSize', value)"
                      />
                      <p class="vacancy-cover-page__hint-text">
                        {{ t('vacancy.cover.fontSizeHint') }}
                      </p>
                    </div>

                    <div class="vacancy-cover-page__control">
                      <label class="vacancy-cover-page__label">
                        {{ t('resume.settings.lineHeight.label') }}
                        <span class="vacancy-cover-page__value">{{
                          formatSettings.lineHeight.toFixed(1)
                        }}</span>
                      </label>
                      <USlider
                        :model-value="formatSettings.lineHeight"
                        :min="1"
                        :max="1.5"
                        :step="0.1"
                        :disabled="!hasCoverLetter"
                        @update:model-value="value => updateFormatSetting('lineHeight', value)"
                      />
                      <p class="vacancy-cover-page__hint-text">
                        {{ t('vacancy.cover.lineHeightHint') }}
                      </p>
                    </div>

                    <div class="vacancy-cover-page__control">
                      <label class="vacancy-cover-page__label">
                        {{ t('vacancy.cover.paragraphSpacingLabel') }}
                        <span class="vacancy-cover-page__value">{{
                          formatSettings.blockSpacing
                        }}</span>
                      </label>
                      <USlider
                        :model-value="formatSettings.blockSpacing"
                        :min="1"
                        :max="9"
                        :step="1"
                        :disabled="!hasCoverLetter"
                        @update:model-value="value => updateFormatSetting('blockSpacing', value)"
                      />
                      <p class="vacancy-cover-page__hint-text">
                        {{ t('vacancy.cover.paragraphSpacingHint') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      </template>

      <template #right-actions>
        <div class="vacancy-cover-page__actions">
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-copy"
            :disabled="!hasCoverLetter || !contentMarkdown.trim()"
            @click="copyContent"
          >
            {{ t('vacancy.cover.copy') }}
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-download"
            :disabled="!hasCoverLetter || !contentMarkdown.trim()"
            :loading="downloadingPdf"
            @click="downloadPdf"
          >
            {{ t('vacancy.cover.downloadPdf') }}
          </UButton>
        </div>
      </template>

      <template #preview>
        <div v-if="!hasCoverLetter" class="vacancy-cover-page__empty">
          <UIcon name="i-lucide-mail" class="h-14 w-14 text-muted" />
          <h3 class="mt-4 text-lg font-semibold">{{ t('vacancy.cover.noCoverLetter') }}</h3>
          <p class="mt-2 text-muted">{{ t('vacancy.cover.generateHint') }}</p>
        </div>

        <div v-else-if="viewMode === 'edit'" class="vacancy-cover-page__editor-pane">
          <UEditor
            v-slot="{ editor }"
            v-model="contentMarkdown"
            content-type="markdown"
            :placeholder="t('vacancy.cover.editorPlaceholder')"
            :ui="markdownEditorUi"
            class="vacancy-cover-page__markdown-editor"
          >
            <UEditorToolbar
              :editor="editor"
              :items="markdownEditorToolbarItems"
              class="vacancy-cover-page__markdown-editor-toolbar bg-default"
            />
          </UEditor>
          <p v-if="coverLetterSaving" class="vacancy-cover-page__saving">
            {{ t('vacancy.resume.saving') }}
          </p>
        </div>

        <div v-else class="vacancy-cover-page__preview-wrap">
          <VacancyCoverPaperPreview
            :html-content="previewHtml"
            :subject-line="displaySubjectLine"
            :settings="formatSettings"
          />
          <p v-if="coverLetterSaving" class="vacancy-cover-page__saving">
            {{ t('vacancy.resume.saving') }}
          </p>
        </div>
      </template>

      <template #mobile-preview-actions>
        <div class="vacancy-cover-page__actions">
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-copy"
            :disabled="!hasCoverLetter || !contentMarkdown.trim()"
            @click="copyContent"
          >
            {{ t('vacancy.cover.copy') }}
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-download"
            :disabled="!hasCoverLetter || !contentMarkdown.trim()"
            :loading="downloadingPdf"
            @click="downloadPdf"
          >
            {{ t('vacancy.cover.downloadPdf') }}
          </UButton>
        </div>
      </template>
    </BaseEditorLayout>
  </div>
</template>

<script setup lang="ts">
import type {
  CoverLetter,
  CoverLetterGenerateBody,
  CoverLetterLanguage,
  CoverLetterLengthPreset,
  CoverLetterTone,
  CoverLetterType,
  SpacingSettings
} from '@int/schema';
import type { BaseEditorLayoutModeOption } from '@site/base/app/components/base/editor-layout/types';
import {
  DefaultCoverLetterFormatSettings,
  normalizeNullableText,
  SpacingSettingsSchema
} from '@int/schema';
import { coverLetterApi } from '@site/vacancy/app/infrastructure/cover-letter.api';
import { markdownToHtml, markdownToPlainText } from '@site/vacancy/app/utils/cover-letter-markdown';

defineOptions({ name: 'VacancyCoverPage' });

definePageMeta({
  layout: 'editor',
  key: 'vacancy-cover'
});

type ViewMode = 'edit' | 'preview';
type LeftPanelTab = 'inputs' | 'format';

type EditorSnapshot = {
  contentMarkdown: string;
  subjectLine: string | null;
  formatSettings: SpacingSettings;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const vacancyStore = useVacancyStore();

const {
  getCurrentVacancy,
  getOverviewLatestGeneration,
  getCoverLetter,
  getCoverLetterGenerating,
  getCoverLetterSaving
} = storeToRefs(vacancyStore);

const vacancyId = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
});

const generationSettings = reactive({
  language: 'en' as CoverLetterLanguage,
  type: 'letter' as CoverLetterType,
  tone: 'professional' as CoverLetterTone,
  lengthPreset: 'standard' as CoverLetterLengthPreset,
  recipientName: '',
  includeSubjectLine: false,
  instructions: ''
});

const contentMarkdown = ref('');
const subjectLine = ref<string | null>(null);
const formatSettings = reactive<SpacingSettings>(structuredClone(DefaultCoverLetterFormatSettings));
const viewMode = ref<ViewMode>('edit');
const activeLeftTab = ref<LeftPanelTab>('inputs');
const downloadingPdf = ref(false);

const historyEntries = ref<EditorSnapshot[]>([]);
const historyIndex = ref(-1);
const isHydrating = ref(false);
const isRestoringHistory = ref(false);
const serverSnapshot = ref<EditorSnapshot | null>(null);

const hasGeneration = computed(() => Boolean(getOverviewLatestGeneration.value));
const hasCoverLetter = computed(() => Boolean(getCoverLetter.value));
const coverLetterGenerating = computed(() => getCoverLetterGenerating.value);
const coverLetterSaving = computed(() => getCoverLetterSaving.value);
const inputsTabValue: LeftPanelTab = 'inputs';

const tabsUi = {
  indicator: 'hidden',
  trigger:
    'data-[state=active]:bg-primary data-[state=active]:text-inverted data-[state=active]:shadow-xs'
} as const;

const leftTabItems = computed(() => [
  {
    label: t('vacancy.cover.inputsTitle'),
    value: inputsTabValue,
    icon: 'i-lucide-sliders-horizontal'
  },
  {
    label: t('vacancy.cover.formatTitle'),
    value: 'format' as LeftPanelTab,
    icon: 'i-lucide-settings'
  }
]);

const viewModeOptions = computed<BaseEditorLayoutModeOption[]>(() => [
  {
    value: 'preview',
    label: t('vacancy.cover.preview'),
    icon: 'i-lucide-eye'
  },
  {
    value: 'edit',
    label: t('resume.tabs.edit'),
    icon: 'i-lucide-pencil'
  }
]);

const markdownEditorToolbarItems = computed(() => [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: t('resume.history.undo') } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: t('resume.history.redo') } }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    {
      kind: 'mark',
      mark: 'underline',
      icon: 'i-lucide-underline',
      tooltip: { text: 'Underline' }
    }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Bullet list' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Ordered list' } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Quote' } }
  ]
]);

const markdownEditorUi = {
  root: 'w-full',
  content: 'min-h-[640px]',
  base: 'min-h-[640px] p-4'
} as const;

const languageItems = computed(() => [
  { label: t('vacancy.cover.languageEnglish'), value: 'en' },
  { label: t('vacancy.cover.languageDanish'), value: 'da' }
]);

const typeItems = computed(() => [
  { label: t('vacancy.cover.typeLetter'), value: 'letter' },
  { label: t('vacancy.cover.typeMessage'), value: 'message' }
]);

const toneItems = computed(() => [
  { label: t('vacancy.cover.toneProfessional'), value: 'professional' },
  { label: t('vacancy.cover.toneFriendly'), value: 'friendly' },
  { label: t('vacancy.cover.toneEnthusiastic'), value: 'enthusiastic' },
  { label: t('vacancy.cover.toneDirect'), value: 'direct' }
]);

const lengthItems = computed(() => [
  { label: t('vacancy.cover.lengthShort'), value: 'short' },
  { label: t('vacancy.cover.lengthStandard'), value: 'standard' },
  { label: t('vacancy.cover.lengthLong'), value: 'long' }
]);

const previewHtml = computed(() => markdownToHtml(contentMarkdown.value));
const displaySubjectLine = computed(() => normalizeNullableText(subjectLine.value));
const isViewMode = (value: string): value is ViewMode => value === 'edit' || value === 'preview';
const layoutMode = computed<string>({
  get: () => viewMode.value,
  set: value => {
    if (isViewMode(value)) {
      viewMode.value = value;
    }
  }
});

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(
  () => historyIndex.value >= 0 && historyIndex.value < historyEntries.value.length - 1
);

const formatSettingLimits: Record<
  keyof SpacingSettings,
  { min: number; max: number; round?: boolean; precision?: number }
> = {
  marginX: { min: 10, max: 26 },
  marginY: { min: 10, max: 26 },
  fontSize: { min: 10, max: 14, precision: 1 },
  lineHeight: { min: 1, max: 1.5, precision: 1 },
  blockSpacing: { min: 1, max: 9, round: true }
};

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const toSliderNumber = (value: number | number[] | undefined): number | null => {
  if (typeof value === 'undefined') return null;
  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

function updateFormatSetting(
  key: keyof SpacingSettings,
  rawValue: number | number[] | undefined
): void {
  if (!hasCoverLetter.value) return;

  const value = toSliderNumber(rawValue);
  if (value === null || !Number.isFinite(value)) return;

  const limits = formatSettingLimits[key];
  const clampedValue = Math.min(limits.max, Math.max(limits.min, value));
  const normalizedValue = limits.round
    ? Math.round(clampedValue)
    : typeof limits.precision === 'number'
      ? Number(clampedValue.toFixed(limits.precision))
      : clampedValue;

  formatSettings[key] = normalizedValue;
}

const toEditorSnapshot = (): EditorSnapshot => ({
  contentMarkdown: contentMarkdown.value,
  subjectLine: subjectLine.value,
  formatSettings: {
    marginX: formatSettings.marginX,
    marginY: formatSettings.marginY,
    fontSize: formatSettings.fontSize,
    lineHeight: formatSettings.lineHeight,
    blockSpacing: formatSettings.blockSpacing
  }
});

const cloneSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => ({
  contentMarkdown: snapshot.contentMarkdown,
  subjectLine: snapshot.subjectLine,
  formatSettings: {
    marginX: snapshot.formatSettings.marginX,
    marginY: snapshot.formatSettings.marginY,
    fontSize: snapshot.formatSettings.fontSize,
    lineHeight: snapshot.formatSettings.lineHeight,
    blockSpacing: snapshot.formatSettings.blockSpacing
  }
});

const snapshotsEqual = (a: EditorSnapshot | null, b: EditorSnapshot | null): boolean => {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

function applySnapshot(snapshot: EditorSnapshot): void {
  isRestoringHistory.value = true;

  contentMarkdown.value = snapshot.contentMarkdown;
  subjectLine.value = snapshot.subjectLine;
  Object.assign(formatSettings, snapshot.formatSettings);

  queueMicrotask(() => {
    isRestoringHistory.value = false;
  });
}

function resetHistory(initialSnapshot: EditorSnapshot | null): void {
  if (!initialSnapshot) {
    historyEntries.value = [];
    historyIndex.value = -1;
    return;
  }

  historyEntries.value = [cloneSnapshot(initialSnapshot)];
  historyIndex.value = 0;
}

const pushHistorySnapshot = useDebounceFn(() => {
  if (!hasCoverLetter.value || isHydrating.value || isRestoringHistory.value) return;

  const current = toEditorSnapshot();
  const currentAtIndex = historyEntries.value[historyIndex.value];

  if (currentAtIndex && snapshotsEqual(current, currentAtIndex)) {
    return;
  }

  const nextHistory = historyEntries.value.slice(0, historyIndex.value + 1);
  nextHistory.push(cloneSnapshot(current));

  if (nextHistory.length > 20) {
    nextHistory.shift();
  }

  historyEntries.value = nextHistory;
  historyIndex.value = nextHistory.length - 1;
}, 350);

const autosaveEditor = useDebounceFn(async () => {
  if (!hasCoverLetter.value || isHydrating.value) return;

  const coverLetterId = getCoverLetter.value?.id;
  if (!coverLetterId) return;

  const current = toEditorSnapshot();
  if (snapshotsEqual(current, serverSnapshot.value)) {
    return;
  }

  try {
    const updated = await vacancyStore.patchCoverLetter(coverLetterId, {
      contentMarkdown: current.contentMarkdown,
      subjectLine: current.subjectLine,
      formatSettings: current.formatSettings
    });

    if (!updated) return;

    serverSnapshot.value = toSnapshotFromCoverLetter(updated);
  } catch (error) {
    toast.add({
      title: t('vacancy.cover.saveFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  }
}, 1300);

watch(
  () => [
    contentMarkdown.value,
    subjectLine.value,
    formatSettings.marginX,
    formatSettings.marginY,
    formatSettings.fontSize,
    formatSettings.lineHeight,
    formatSettings.blockSpacing
  ],
  () => {
    if (!hasCoverLetter.value || isHydrating.value) return;

    pushHistorySnapshot();
    void autosaveEditor();
  }
);

function toSnapshotFromCoverLetter(coverLetter: CoverLetter): EditorSnapshot {
  const parsedSettings = SpacingSettingsSchema.safeParse(coverLetter.formatSettings);

  return {
    contentMarkdown: coverLetter.contentMarkdown,
    subjectLine: coverLetter.subjectLine,
    formatSettings: parsedSettings.success
      ? parsedSettings.data
      : structuredClone(DefaultCoverLetterFormatSettings)
  };
}

function hydrateFromCoverLetter(coverLetter: CoverLetter): void {
  isHydrating.value = true;

  generationSettings.language = coverLetter.language;
  generationSettings.type = coverLetter.type;
  generationSettings.tone = coverLetter.tone;
  generationSettings.lengthPreset = coverLetter.lengthPreset;
  generationSettings.recipientName = coverLetter.recipientName ?? '';
  generationSettings.includeSubjectLine = coverLetter.includeSubjectLine;
  generationSettings.instructions = coverLetter.instructions ?? '';

  contentMarkdown.value = coverLetter.contentMarkdown;
  subjectLine.value = coverLetter.subjectLine;

  const parsedSettings = SpacingSettingsSchema.safeParse(coverLetter.formatSettings);
  Object.assign(
    formatSettings,
    parsedSettings.success ? parsedSettings.data : structuredClone(DefaultCoverLetterFormatSettings)
  );

  const snapshot = toSnapshotFromCoverLetter(coverLetter);
  serverSnapshot.value = cloneSnapshot(snapshot);
  resetHistory(snapshot);

  isHydrating.value = false;
}

function hydrateDefaults(): void {
  isHydrating.value = true;

  generationSettings.language = 'en';
  generationSettings.type = 'letter';
  generationSettings.tone = 'professional';
  generationSettings.lengthPreset = 'standard';
  generationSettings.recipientName = '';
  generationSettings.includeSubjectLine = false;
  generationSettings.instructions = getCurrentVacancy.value?.notes ?? '';

  contentMarkdown.value = '';
  subjectLine.value = null;
  Object.assign(formatSettings, structuredClone(DefaultCoverLetterFormatSettings));

  serverSnapshot.value = null;
  resetHistory(null);

  isHydrating.value = false;
}

async function handleGenerate(): Promise<void> {
  if (!hasGeneration.value) {
    return;
  }

  const hadCoverLetter = hasCoverLetter.value;

  const payload: CoverLetterGenerateBody = {
    language: generationSettings.language,
    type: generationSettings.type,
    tone: generationSettings.tone,
    lengthPreset: generationSettings.lengthPreset,
    recipientName: normalizeNullableText(generationSettings.recipientName),
    includeSubjectLine:
      generationSettings.type === 'message' ? generationSettings.includeSubjectLine : false,
    instructions: normalizeNullableText(generationSettings.instructions)
  };

  try {
    const coverLetter = await vacancyStore.generateCoverLetter(vacancyId.value, payload);
    hydrateFromCoverLetter(coverLetter);
    viewMode.value = 'preview';

    toast.add({
      title: hadCoverLetter ? t('vacancy.cover.regenerated') : t('vacancy.cover.generated'),
      color: 'success',
      icon: 'i-lucide-check-circle'
    });
  } catch (error) {
    toast.add({
      title: t('vacancy.cover.generateFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  }
}

function undo(): void {
  if (!canUndo.value) return;

  historyIndex.value -= 1;
  const snapshot = historyEntries.value[historyIndex.value];
  if (snapshot) {
    applySnapshot(snapshot);
  }
}

function redo(): void {
  if (!canRedo.value) return;

  historyIndex.value += 1;
  const snapshot = historyEntries.value[historyIndex.value];
  if (snapshot) {
    applySnapshot(snapshot);
  }
}

async function writeToClipboard(value: string): Promise<void> {
  if (!import.meta.client) {
    return;
  }

  if (import.meta.client && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

async function copyContent(): Promise<void> {
  const plainText = markdownToPlainText(contentMarkdown.value);
  const payload = displaySubjectLine.value
    ? `Subject: ${displaySubjectLine.value}\n\n${plainText}`
    : plainText;

  if (!payload.trim()) return;

  try {
    await writeToClipboard(payload);

    toast.add({
      title: t('vacancy.cover.copied'),
      color: 'success',
      icon: 'i-lucide-check-circle'
    });
  } catch (error) {
    toast.add({
      title: t('vacancy.cover.copyFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  }
}

async function downloadPdf(): Promise<void> {
  if (!contentMarkdown.value.trim()) return;

  downloadingPdf.value = true;

  try {
    const company = getCurrentVacancy.value?.company ?? 'Cover_Letter';
    const baseFilename = `${company}_Cover_Letter.pdf`.replace(/[^\w.-]/g, '_');

    const prepared = await coverLetterApi.preparePdf({
      contentMarkdown: contentMarkdown.value,
      subjectLine: displaySubjectLine.value,
      settings: { ...formatSettings },
      filename: baseFilename
    });

    const response = await fetch(
      `/api/cover-letter/pdf/file?token=${encodeURIComponent(prepared.token)}`,
      {
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error(`PDF export failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = baseFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast.add({
      title: t('vacancy.cover.pdfReady'),
      color: 'success',
      icon: 'i-lucide-check-circle'
    });
  } catch (error) {
    toast.add({
      title: t('vacancy.cover.pdfFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    downloadingPdf.value = false;
  }
}

const asyncDataKey = computed(() => `vacancy-cover-page:${vacancyId.value}`);

const { pending, refresh } = await useAsyncData(
  asyncDataKey,
  async () => {
    if (!vacancyId.value) {
      return false;
    }

    await vacancyStore.fetchVacancyOverview(vacancyId.value);
    const coverLetter = await vacancyStore.fetchCoverLetter(vacancyId.value);

    if (coverLetter) {
      hydrateFromCoverLetter(coverLetter);
      return true;
    }

    hydrateDefaults();
    return true;
  },
  {
    watch: [vacancyId],
    // Always fetch latest server state for cover letter instead of reusing stale cached payload.
    getCachedData: () => undefined
  }
);

onMounted(() => {
  if (!vacancyId.value) return;
  void refresh();
});

const pageLoading = computed(() => pending.value);
</script>

<style lang="scss">
.vacancy-cover-page {
  height: 100%;
  min-height: 0;

  &__loading {
    min-height: 400px;
  }

  &__layout {
    height: 100%;
    min-height: 0;
  }

  &__left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  &__tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding: 1rem 1rem 0;
  }

  &__tabs > [role='tabpanel'] {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden;
  }

  &__tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 0;
  }

  &__inputs-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }

  &__format-settings {
    padding: 0 1rem 1rem;
  }

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

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  &__editor-pane,
  &__preview-wrap {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 794px;
    min-height: 0;
    margin-inline: auto;
  }

  &__preview-wrap {
    overflow: auto;
    padding-right: 0.25rem;
  }

  &__markdown-editor {
    width: 100%;
    border: 1px solid var(--ui-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background-color: var(--ui-bg);
  }

  &__markdown-editor-toolbar {
    border-bottom: 1px solid var(--ui-border);
    padding: 0.5rem 0.75rem;
    overflow-x: auto;
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

  &__empty {
    min-height: 420px;
    border: 1px dashed var(--ui-border-muted);
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
    width: min(794px, 100%);
    margin-inline: auto;
  }

  &__saving {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--ui-text-muted);
  }

  @media (width <= 1200px) {
    &__actions {
      justify-content: flex-start;
    }

    &__markdown-editor {
      width: 100%;
    }
  }
}
</style>
