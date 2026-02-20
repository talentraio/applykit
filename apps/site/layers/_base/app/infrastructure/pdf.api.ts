import type { ExportFormat, ResumeContent, SpacingSettings } from '@int/schema';

export type PdfPayload = {
  format: ExportFormat;
  content: ResumeContent;
  settings?: Partial<SpacingSettings>;
  photoUrl?: string;
  filename?: string;
};

export const pdfApi = {
  /**
   * Prepare short-lived PDF export token.
   */
  async prepare(payload: PdfPayload) {
    return await useApi('/api/pdf/prepare', {
      method: 'POST',
      body: payload
    });
  },

  /**
   * Resolve payload by token for preview page.
   */
  async fetchPayload(token: string) {
    return await useApi('/api/pdf/payload', {
      query: { token }
    });
  }
};
