<template>
  <div class="vacancy-cover-page">
    <BasePageLoading v-if="pageLoading" show-text wrapper-class="vacancy-cover-page__loading" />

    <div v-else class="vacancy-cover-page__layout">
      <aside class="vacancy-cover-page__inputs">
        <UPageCard>
          <template #header>
            <h2 class="text-lg font-semibold">{{ t('vacancy.cover.inputsTitle') }}</h2>
          </template>

          <div class="space-y-4">
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
        </UPageCard>
      </aside>

      <section class="vacancy-cover-page__workspace">
        <div v-if="!hasCoverLetter" class="vacancy-cover-page__empty">
          <UIcon name="i-lucide-mail" class="h-14 w-14 text-muted" />
          <h3 class="mt-4 text-lg font-semibold">{{ t('vacancy.cover.noCoverLetter') }}</h3>
          <p class="mt-2 text-muted">{{ t('vacancy.cover.generateHint') }}</p>
        </div>

        <div v-else class="vacancy-cover-page__editor">
          <div class="vacancy-cover-page__toolbar">
            <div class="vacancy-cover-page__toolbar-group">
              <UButton
                :variant="viewMode === 'edit' ? 'solid' : 'outline'"
                size="sm"
                icon="i-lucide-pencil"
                @click="viewMode = 'edit'"
              >
                {{ t('resume.tabs.edit') }}
              </UButton>
              <UButton
                :variant="viewMode === 'preview' ? 'solid' : 'outline'"
                size="sm"
                icon="i-lucide-eye"
                @click="viewMode = 'preview'"
              >
                {{ t('vacancy.cover.preview') }}
              </UButton>
            </div>

            <div class="vacancy-cover-page__toolbar-group">
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-undo"
                :disabled="!canUndo"
                @click="undo"
              >
                {{ t('resume.history.undo') }}
              </UButton>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-redo"
                :disabled="!canRedo"
                @click="redo"
              >
                {{ t('resume.history.redo') }}
              </UButton>
              <UButton size="sm" variant="outline" icon="i-lucide-copy" @click="copyContent">
                {{ t('vacancy.cover.copy') }}
              </UButton>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-download"
                :loading="downloadingPdf"
                @click="downloadPdf"
              >
                {{ t('vacancy.cover.downloadPdf') }}
              </UButton>
            </div>
          </div>

          <div v-if="viewMode === 'edit'" class="vacancy-cover-page__edit-grid">
            <UTextarea
              v-model="contentMarkdown"
              class="vacancy-cover-page__markdown"
              :rows="20"
              autoresize
              :placeholder="t('vacancy.cover.editorPlaceholder')"
            />

            <UPageCard>
              <template #header>
                <h3 class="text-base font-semibold">{{ t('vacancy.cover.formatTitle') }}</h3>
              </template>

              <div class="grid grid-cols-1 gap-3">
                <UFormField :label="t('resume.settings.marginX.label')">
                  <UInput
                    :model-value="String(formatSettings.marginX)"
                    type="number"
                    min="10"
                    max="26"
                    step="1"
                    @update:model-value="value => updateFormatSetting('marginX', value)"
                  />
                </UFormField>

                <UFormField :label="t('resume.settings.marginY.label')">
                  <UInput
                    :model-value="String(formatSettings.marginY)"
                    type="number"
                    min="10"
                    max="26"
                    step="1"
                    @update:model-value="value => updateFormatSetting('marginY', value)"
                  />
                </UFormField>

                <UFormField :label="t('resume.settings.fontSize.label')">
                  <UInput
                    :model-value="String(formatSettings.fontSize)"
                    type="number"
                    min="9"
                    max="13"
                    step="0.1"
                    @update:model-value="value => updateFormatSetting('fontSize', value)"
                  />
                </UFormField>

                <UFormField :label="t('resume.settings.lineHeight.label')">
                  <UInput
                    :model-value="String(formatSettings.lineHeight)"
                    type="number"
                    min="1.1"
                    max="1.5"
                    step="0.05"
                    @update:model-value="value => updateFormatSetting('lineHeight', value)"
                  />
                </UFormField>

                <UFormField :label="t('resume.settings.blockSpacing.label')">
                  <UInput
                    :model-value="String(formatSettings.blockSpacing)"
                    type="number"
                    min="1"
                    max="9"
                    step="1"
                    @update:model-value="value => updateFormatSetting('blockSpacing', value)"
                  />
                </UFormField>
              </div>
            </UPageCard>
          </div>

          <div v-else class="vacancy-cover-page__preview-wrap">
            <VacancyCoverPaperPreview
              :html-content="previewHtml"
              :subject-line="displaySubjectLine"
              :settings="formatSettings"
            />
          </div>

          <p v-if="coverLetterSaving" class="vacancy-cover-page__saving">
            {{ t('vacancy.resume.saving') }}
          </p>
        </div>
      </section>
    </div>
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

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(
  () => historyIndex.value >= 0 && historyIndex.value < historyEntries.value.length - 1
);

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

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

function updateFormatSetting(key: keyof SpacingSettings, value: string | number): void {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return;
  }

  const limits: Record<keyof SpacingSettings, { min: number; max: number; round?: boolean }> = {
    marginX: { min: 10, max: 26 },
    marginY: { min: 10, max: 26 },
    fontSize: { min: 9, max: 13 },
    lineHeight: { min: 1.1, max: 1.5 },
    blockSpacing: { min: 1, max: 9, round: true }
  };

  const limit = limits[key];
  const clamped = Math.min(limit.max, Math.max(limit.min, parsed));
  formatSettings[key] = limit.round ? Math.round(clamped) : clamped;
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
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
    gap: 1rem;
    height: 100%;
    min-height: 0;
    padding: 1rem;

    @media (width <= 1200px) {
      grid-template-columns: 1fr;
      overflow: auto;
    }
  }

  &__inputs {
    min-height: 0;
    overflow: auto;
  }

  &__workspace {
    min-height: 0;
    overflow: auto;
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
  }

  &__editor {
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  &__toolbar-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__edit-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 0.75rem;
    min-height: 0;

    @media (width <= 1200px) {
      grid-template-columns: 1fr;
    }
  }

  &__markdown {
    min-height: 520px;
  }

  &__preview-wrap {
    min-height: 0;
    overflow: auto;
    padding-right: 0.25rem;
  }

  &__saving {
    font-size: 0.875rem;
    color: var(--ui-text-muted);
  }
}
</style>
