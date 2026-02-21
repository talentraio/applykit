import type {
  CoverLetter,
  CoverLetterGenerateBody,
  CoverLetterPatchBody,
  SpacingSettings
} from '@int/schema';
import type { VacancyCoverLetterResponse } from '@layer/api/types/vacancies';

type CoverLetterPdfPayload = {
  contentMarkdown: string;
  subjectLine?: string | null;
  settings?: Partial<SpacingSettings>;
  filename?: string;
};

export const coverLetterApi = {
  async fetchLatest(vacancyId: string): Promise<VacancyCoverLetterResponse> {
    return await useApi(`/api/vacancies/${vacancyId}/cover-letter`, {
      method: 'GET'
    });
  },

  async generate(vacancyId: string, payload: CoverLetterGenerateBody): Promise<CoverLetter> {
    return await useApi(`/api/vacancies/${vacancyId}/cover-letter/generate`, {
      method: 'POST',
      body: payload
    });
  },

  async patch(id: string, payload: CoverLetterPatchBody): Promise<CoverLetter> {
    return await useApi(`/api/cover-letters/${id}`, {
      method: 'PATCH',
      body: payload
    });
  },

  async preparePdf(payload: CoverLetterPdfPayload): Promise<{ token: string; expiresAt: number }> {
    return await useApi('/api/cover-letter/pdf/prepare', {
      method: 'POST',
      body: payload
    });
  },

  async fetchPdfPayload(token: string): Promise<CoverLetterPdfPayload> {
    return await useApi('/api/cover-letter/pdf/payload', {
      method: 'GET',
      query: { token }
    });
  }
};
