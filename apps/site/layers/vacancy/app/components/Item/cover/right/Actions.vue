<template>
  <div class="vacancy-item-cover-right-actions vacancy-cover-page__actions">
    <UButton
      size="sm"
      variant="outline"
      icon="i-lucide-copy"
      :disabled="actionsDisabled"
      @click="copyContent"
    >
      {{ t('vacancy.cover.copy') }}
    </UButton>

    <UButton
      size="sm"
      variant="outline"
      icon="i-lucide-download"
      :disabled="actionsDisabled"
      :loading="downloadingPdf"
      @click="downloadPdf"
    >
      {{ t('vacancy.cover.downloadPdf') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';
import { coverLetterApi } from '@site/vacancy/app/infrastructure/cover-letter.api';
import { markdownToPlainText } from '@site/vacancy/app/utils/cover-letter-markdown';

defineOptions({ name: 'VacancyItemCoverRightActions' });

const props = defineProps<{
  hasCoverLetter: boolean;
  contentMarkdown: string;
  subjectLine?: string | null;
  formatSettings: SpacingSettings;
}>();

const { t } = useI18n();
const toast = useToast();
const { downloadPdfFile } = usePdfDownload();
const { copy, isSupported: isClipboardSupported } = useClipboard();
const downloadingPdf = ref(false);

const actionsDisabled = computed(() => !props.hasCoverLetter || !props.contentMarkdown.trim());

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const writeToClipboard = async (value: string): Promise<void> => {
  if (!import.meta.client) return;

  if (!isClipboardSupported.value) {
    throw new Error('Clipboard API is not available');
  }

  await copy(value);
};

const copyContent = async (): Promise<void> => {
  const plainText = markdownToPlainText(props.contentMarkdown);
  const normalizedSubject = props.subjectLine?.trim();
  const payload = normalizedSubject ? `Subject: ${normalizedSubject}\n\n${plainText}` : plainText;

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
};

const downloadPdf = async (): Promise<void> => {
  if (!props.contentMarkdown.trim()) return;

  downloadingPdf.value = true;

  try {
    const settings = props.formatSettings;
    const prepared = await coverLetterApi.preparePdf({
      contentMarkdown: props.contentMarkdown,
      subjectLine: props.subjectLine,
      settings: {
        marginX: settings.marginX,
        marginY: settings.marginY,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        blockSpacing: settings.blockSpacing
      }
    });

    await downloadPdfFile(
      `/api/cover-letter/pdf/file?token=${encodeURIComponent(prepared.token)}`,
      {
        fallbackFilename: 'Cover_Letter.pdf'
      }
    );

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
};
</script>

<style lang="scss">
.vacancy-item-cover-right-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (width <= 1200px) {
  .vacancy-item-cover-right-actions {
    justify-content: flex-start;
  }
}
</style>
