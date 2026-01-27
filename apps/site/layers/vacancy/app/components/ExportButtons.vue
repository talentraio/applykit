<template>
  <div class="vacancy-export-buttons flex flex-wrap gap-3">
    <UButton
      variant="outline"
      icon="i-lucide-file-down"
      :loading="isExportingAts"
      :disabled="isDisabled"
      @click="handleExport(atsFormat)"
    >
      {{ getButtonLabel(atsFormat) }}
    </UButton>
    <UButton
      variant="outline"
      icon="i-lucide-file-down"
      :loading="isExportingHuman"
      :disabled="isDisabled"
      @click="handleExport(humanFormat)"
    >
      {{ getButtonLabel(humanFormat) }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
/**
 * Export Buttons Component
 *
 * Provides ATS and Human export actions for a vacancy.
 * Handles loading state, error mapping, and download trigger.
 *
 * Related: T123 (US6)
 */

import type { ExportFormat } from '@int/schema';
import { EXPORT_FORMAT_MAP } from '@int/schema';

defineOptions({ name: 'VacancyExportButtons' });

const props = withDefaults(
  defineProps<{
    vacancyId: string;
    generationId?: string;
    disabled?: boolean;
  }>(),
  {
    generationId: undefined,
    disabled: false
  }
);

const { exportResume } = useExport();
const { t } = useI18n();
const toast = useToast();

const exportingFormat = ref<ExportFormat | null>(null);
const atsFormat = EXPORT_FORMAT_MAP.ATS;
const humanFormat = EXPORT_FORMAT_MAP.HUMAN;

const isExportingAts = computed(() => exportingFormat.value === atsFormat);
const isExportingHuman = computed(() => exportingFormat.value === humanFormat);
const isDisabled = computed(() => props.disabled || exportingFormat.value !== null);

const getButtonLabel = (format: ExportFormat) => {
  if (exportingFormat.value === format) return t('export.inProgress');
  return format === atsFormat ? t('export.button.ats') : t('export.button.human');
};

const getErrorStatus = (error: unknown) => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = error.statusCode;
    if (typeof statusCode === 'number') return statusCode;
  }
  return null;
};

const getErrorMessageKey = (statusCode: number | null) => {
  if (statusCode === 400) return 'export.error.invalidFormat';
  if (statusCode === 401) return 'common.error.unauthorized';
  if (statusCode === 403) return 'common.error.forbidden';
  if (statusCode === 404) return 'export.error.noGeneration';
  if (statusCode === 410) return 'export.error.generationExpired';
  if (statusCode === 429) return 'export.error.rateLimitExceeded';
  return 'export.error.generic';
};

const triggerDownload = (url: string, filename?: string) => {
  if (!import.meta.client) return;

  const link = document.createElement('a');
  link.href = url;
  if (filename) link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const handleExport = async (format: ExportFormat) => {
  if (isDisabled.value) return;

  exportingFormat.value = format;

  try {
    const result = await exportResume(props.vacancyId, {
      format,
      generationId: props.generationId
    });

    triggerDownload(result.url, result.filename);

    toast.add({
      title: t('export.success'),
      description: format === atsFormat ? t('export.format.ats') : t('export.format.human'),
      color: 'success'
    });
  } catch (error) {
    const statusCode = getErrorStatus(error);
    const messageKey = getErrorMessageKey(statusCode);

    toast.add({
      title: t('export.error.exportFailed'),
      description: t(messageKey),
      color: 'error'
    });
  } finally {
    exportingFormat.value = null;
  }
};
</script>

<style lang="scss">
.vacancy-export-buttons {
  // Component-specific styling if needed
}
</style>
