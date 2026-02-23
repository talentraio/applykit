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
        <VacancyItemCoverLeft
          v-model:active-tab="activeLeftTab"
          :format-settings="formatSettings"
          :has-cover-letter="hasCoverLetter"
          @generate="handleGenerate"
          @update-format-setting="updateFormatSetting"
        />
      </template>

      <template #right-actions>
        <VacancyItemCoverRightActions
          :has-cover-letter="hasCoverLetter"
          :content-markdown="contentMarkdown"
          :subject-line="displaySubjectLine"
          :format-settings="formatSettings"
        />
      </template>

      <template #preview>
        <div v-if="!hasCoverLetter" class="vacancy-cover-page__empty">
          <UIcon name="i-lucide-mail" class="h-14 w-14 text-muted" />
          <h3 class="mt-4 text-lg font-semibold">{{ t('vacancy.cover.noCoverLetter') }}</h3>
          <p class="mt-2 text-muted">{{ t('vacancy.cover.generateHint') }}</p>
        </div>

        <VacancyItemCoverRightEditor
          v-else-if="viewMode === 'edit'"
          v-model="contentMarkdown"
          :cover-letter-saving="coverLetterSaving"
          :format-settings="formatSettings"
        />

        <div v-else class="vacancy-cover-page__preview-wrap">
          <VacancyItemCoverRightPreview
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
        <VacancyItemCoverRightActions
          :has-cover-letter="hasCoverLetter"
          :content-markdown="contentMarkdown"
          :subject-line="displaySubjectLine"
          :format-settings="formatSettings"
        />
      </template>
    </BaseEditorLayout>
  </div>
</template>

<script setup lang="ts">
import type { BaseEditorLayoutModeOption } from '@site/base/app/components/base/editor-layout/types';
import { normalizeNullableText } from '@int/schema';
import { markdownToHtml } from '@site/vacancy/app/utils/cover-letter-markdown';

defineOptions({ name: 'VacancyCoverPage' });

definePageMeta({
  layout: 'editor',
  key: 'vacancy-cover'
});

type ViewMode = 'edit' | 'preview';
type LeftPanelTab = 'inputs' | 'format';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const vacancyStore = useVacancyStore();

const { getCurrentVacancyMeta } = storeToRefs(vacancyStore);

const vacancyId = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
});

const viewMode = ref<ViewMode>('preview');
const activeLeftTab = ref<LeftPanelTab>('inputs');

const latestGenerationId = computed(() => getCurrentVacancyMeta.value?.latestGenerationId ?? null);
const hasGeneration = computed(() => Boolean(latestGenerationId.value));

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const {
  contentMarkdown,
  subjectLine,
  formatSettings,
  hasPersistedCoverLetter,
  coverLetterSaving,
  canUndo,
  canRedo,
  fetchCoverLetter,
  generateCoverLetter,
  updateFormatSetting,
  undo,
  redo
} = useVacancyCoverLetterEditor({
  onAutoSaveError: error => {
    toast.add({
      title: t('vacancy.cover.saveFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  }
});
const hasCoverLetter = computed(() => hasPersistedCoverLetter.value);

const viewModeOptions = computed<BaseEditorLayoutModeOption[]>(() => [
  {
    value: 'preview',
    label: t('vacancy.cover.preview'),
    icon: 'i-lucide-eye'
  },
  {
    value: 'edit',
    label: t('resume.tabs.edit'),
    icon: 'i-lucide-pencil',
    disabled: !hasCoverLetter.value
  }
]);

const previewHtml = computed(() => markdownToHtml(contentMarkdown.value));
const displaySubjectLine = computed(() => normalizeNullableText(subjectLine.value));
const isViewMode = (value: string): value is ViewMode => value === 'edit' || value === 'preview';
const layoutMode = computed<string>({
  get: () => (hasCoverLetter.value ? viewMode.value : 'preview'),
  set: value => {
    if (!hasCoverLetter.value) {
      viewMode.value = 'preview';
      return;
    }

    if (isViewMode(value)) {
      viewMode.value = value;
    }
  }
});

const handleGenerate = async (): Promise<void> => {
  if (!hasGeneration.value) {
    return;
  }

  const hadCoverLetter = hasCoverLetter.value;

  try {
    await generateCoverLetter(vacancyId.value);
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
};

const loadCoverLetterForVacancy = async (id: string): Promise<void> => {
  if (!id) return;

  await fetchCoverLetter(id);
};

const { pending } = await useAsyncData(
  'vacancy-cover',
  async () => {
    try {
      await loadCoverLetterForVacancy(vacancyId.value);
      return true;
    } catch (error) {
      toast.add({
        title: t('vacancy.cover.fetchFailed'),
        description: getErrorMessage(error),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      });
      return false;
    }
  },
  { watch: [vacancyId] }
);

const pageLoading = computed(() => pending.value);

watch(
  [hasCoverLetter, pageLoading],
  ([hasGeneratedCoverLetter, isLoading]) => {
    if (isLoading) return;
    activeLeftTab.value = hasGeneratedCoverLetter ? 'format' : 'inputs';
  },
  { immediate: true }
);
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

  &__preview-wrap {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 794px;
    min-height: 0;
    margin-inline: auto;
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
}
</style>
