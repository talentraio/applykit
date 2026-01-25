/**
 * Export Composable
 *
 * Thin proxy for export-related API calls.
 * Handles exporting tailored resumes to PDF format (ATS and Human versions).
 *
 * Related: T117 (US6)
 */

import type { ExportFormat } from '@int/schema';

/**
 * Export result from API
 */
export type ExportResult = {
  /**
   * Download URL for the PDF
   */
  url: string;

  /**
   * Suggested filename
   */
  filename: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Export format used
   */
  format: ExportFormat;

  /**
   * URL expiration time (if applicable)
   */
  expiresAt?: string;
};

/**
 * Options for exporting a resume
 */
export type ExportOptions = {
  /**
   * Export format (ATS or Human)
   */
  format: ExportFormat;

  /**
   * Generation ID to export (if not provided, uses latest)
   */
  generationId?: string;
};

export type UseExportReturn = {
  /**
   * Export a tailored resume to PDF
   *
   * @param vacancyId - Vacancy ID to export resume for
   * @param options - Export options (format is required)
   * @returns Export result with download URL
   */
  exportResume: (vacancyId: string, options: ExportOptions) => Promise<ExportResult>;
};

export function useExport(): UseExportReturn {
  /**
   * Export resume to PDF
   */
  const exportResume = async (vacancyId: string, options: ExportOptions): Promise<ExportResult> => {
    const { format, generationId } = options;

    const body: Record<string, unknown> = {
      format
    };

    if (generationId) {
      body.generationId = generationId;
    }

    return await useApi(`/api/vacancies/${vacancyId}/export`, {
      method: 'POST',
      body
    });
  };

  return {
    exportResume
  };
}
