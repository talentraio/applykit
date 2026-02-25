<template>
  <div class="base-download-pdf">
    <UDropdownMenu :items="menuItems">
      <UButton
        color="primary"
        icon="i-lucide-download"
        trailing-icon="i-lucide-chevron-down"
        :size="size"
        :loading="isExporting"
        :disabled="isDisabled"
      >
        <span class="hidden md:inline">{{ t('export.button.download') }}</span>
        <span class="md:hidden">PDF</span>
      </UButton>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
/**
 * Base Download PDF Component
 *
 * Renders a dropdown to download ATS/Human PDF versions.
 * Generates PDF on the client side using the shared resume preview.
 */

import type { ButtonProps } from '#ui/types';
import type {
  ExportFormat,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { pdfApi } from '../../infrastructure/pdf.api';

defineOptions({ name: 'BaseDownloadPdf' });

const props = withDefaults(
  defineProps<{
    content: ResumeContent;
    settings?: FormatSettingsMap;
    photoUrl?: string;
    disabled?: boolean;
    filename?: string;
    formats?: ExportFormat[];
    size?: ButtonProps['size'];
  }>(),
  {
    settings: undefined,
    photoUrl: undefined,
    disabled: false,
    filename: undefined,
    formats: () => [EXPORT_FORMAT_MAP.ATS, EXPORT_FORMAT_MAP.HUMAN],
    size: undefined
  }
);

type FormatSettingsMap = {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
};

const { t } = useI18n();
const toast = useToast();
const { downloadPdfFile } = usePdfDownload();

const atsFormat = EXPORT_FORMAT_MAP.ATS;
const humanFormat = EXPORT_FORMAT_MAP.HUMAN;

const exportingFormat = ref<ExportFormat | null>(null);

const isExporting = computed(() => exportingFormat.value !== null);
const isDisabled = computed(() => props.disabled || !props.content || isExporting.value);

const resolveSettings = (
  format: ExportFormat
): ResumeFormatSettingsAts | ResumeFormatSettingsHuman | undefined => {
  if (!props.settings) return undefined;
  return format === atsFormat ? props.settings.ats : props.settings.human;
};

const availableFormats = computed(() =>
  props.formats.length > 0 ? props.formats : [atsFormat, humanFormat]
);

const sanitizeFilename = (value: string) => value.replace(/[^\w.\-]/g, '_');

const getFilename = (format: ExportFormat) => {
  const suffix = format === atsFormat ? 'ATS' : 'HUMAN';
  const baseName = props.filename ?? `Resume_${suffix}.pdf`;
  const sanitized = sanitizeFilename(baseName);
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return t('export.error.generic');
};

const handleExport = async (format: ExportFormat) => {
  if (isDisabled.value || !props.content) return;

  exportingFormat.value = format;

  try {
    const resolved = resolveSettings(format);
    const payload = {
      format,
      content: props.content,
      settings: resolved?.spacing,
      photoUrl: props.photoUrl,
      filename: getFilename(format)
    };

    const result = await pdfApi.prepare(payload);

    const downloadUrl = `/api/pdf/file?token=${encodeURIComponent(result.token)}`;
    await downloadPdfFile(downloadUrl, { fallbackFilename: getFilename(format) });

    toast.add({
      title: t('export.success'),
      description: format === atsFormat ? t('export.format.ats') : t('export.format.human'),
      color: 'success'
    });
  } catch (error) {
    if (import.meta.dev) {
      console.error('PDF export failed', error);
    }

    const description = getErrorMessage(error);
    toast.add({
      title: t('export.error.exportFailed'),
      description,
      color: 'error'
    });
  } finally {
    exportingFormat.value = null;
  }
};

const menuItems = computed(() => [
  availableFormats.value.map(format => ({
    label: format === atsFormat ? t('export.format.ats') : t('export.format.human'),
    icon: format === atsFormat ? 'i-lucide-file-text' : 'i-lucide-user',
    disabled: isDisabled.value,
    onSelect: () => handleExport(format)
  }))
]);
</script>

<style lang="scss">
.base-download-pdf {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
