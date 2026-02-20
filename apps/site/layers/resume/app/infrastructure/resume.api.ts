import type {
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  Resume,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  ResumeListItem
} from '@int/schema';

export type ResumeWithFormatSettings = Resume & {
  formatSettings: {
    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
  };
};

/**
 * Resume API
 *
 * Handles resume operations for multi-resume architecture.
 * Uses /api/resumes/* endpoints.
 */
export const resumeApi = {
  // ============================================
  // Multi-Resume Endpoints (primary)
  // ============================================

  /**
   * List all resumes for the current user (lightweight)
   * Sorted: default first, then createdAt DESC
   */
  async fetchList(): Promise<{ items: ResumeListItem[] }> {
    return await useApi('/api/resumes', {
      method: 'GET'
    });
  },

  /**
   * Get full resume by ID with ownership check
   * Includes computed isDefault and formatSettings
   */
  async fetchById(id: string): Promise<ResumeWithFormatSettings> {
    return await useApi(`/api/resumes/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Duplicate an existing resume
   * Clones content + format settings, sets name to "copy <source.name>"
   */
  async duplicate(sourceId: string): Promise<Resume> {
    return await useApi(`/api/resumes/${sourceId}/duplicate`, {
      method: 'POST'
    });
  },

  /**
   * Delete a non-default resume
   */
  async deleteResume(id: string): Promise<void> {
    await useApi(`/api/resumes/${id}`, {
      method: 'DELETE'
    });
  },

  /**
   * Update resume name
   */
  async updateName(
    id: string,
    name: string
  ): Promise<{ id: string; name: string; updatedAt: string }> {
    return await useApi(`/api/resumes/${id}/name`, {
      method: 'PUT',
      body: { name }
    });
  },

  /**
   * Set which resume is the user's default
   */
  async setDefault(resumeId: string): Promise<{ success: true }> {
    return await useApi('/api/user/default-resume', {
      method: 'PUT',
      body: { resumeId }
    });
  },

  /**
   * Patch per-resume format settings (deep partial merge)
   */
  async patchSettings(
    resumeId: string,
    patch: PatchFormatSettingsBody
  ): Promise<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }> {
    return await useApi(`/api/resumes/${resumeId}/format-settings`, {
      method: 'PATCH',
      body: patch
    });
  },

  /**
   * Replace per-resume format settings
   * Server endpoint accepts PATCH with full payload.
   */
  async putSettings(
    resumeId: string,
    settings: PutFormatSettingsBody
  ): Promise<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }> {
    return await useApi(`/api/resumes/${resumeId}/format-settings`, {
      method: 'PATCH',
      body: settings
    });
  },

  /**
   * Upload and parse a resume file
   * Creates a new resume by default.
   * If replaceResumeId is passed, replaces base data for that resume.
   */
  async upload(file: File, title?: string, replaceResumeId?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    if (replaceResumeId) {
      formData.append('replaceResumeId', replaceResumeId);
    }

    return await useApi('/api/resumes', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Create a resume from JSON content (manual creation)
   */
  async createFromContent(
    content: ResumeContent,
    title?: string,
    replaceResumeId?: string
  ): Promise<Resume> {
    return await useApi('/api/resumes', {
      method: 'POST',
      body: { content, title, replaceResumeId }
    });
  },

  /**
   * Update resume content and/or title
   */
  async update(
    resumeId: string,
    data: { content?: ResumeContent; title?: string }
  ): Promise<Resume> {
    return await useApi(`/api/resumes/${resumeId}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Update resume content only
   */
  async updateContent(resumeId: string, content: ResumeContent): Promise<Resume> {
    return resumeApi.update(resumeId, { content });
  }
};
