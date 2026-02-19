import type {
  PatchFormatSettingsBody,
  Resume,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  ResumeListItem
} from '@int/schema';

/**
 * Resume API
 *
 * Handles resume operations for multi-resume architecture.
 * Uses /api/resumes/* for new multi-resume endpoints.
 * Legacy /api/resume (singular) endpoints are deprecated.
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
    return await useApi<{ items: ResumeListItem[] }>('/api/resumes', {
      method: 'GET'
    });
  },

  /**
   * Get full resume by ID with ownership check
   * Includes computed isDefault
   */
  async fetchById(id: string): Promise<Resume> {
    return await useApi<Resume>(`/api/resumes/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Duplicate an existing resume
   * Clones content + format settings, sets name to "copy <source.name>"
   */
  async duplicate(sourceId: string): Promise<Resume> {
    return await useApi<Resume>(`/api/resumes/${sourceId}/duplicate`, {
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
    return await useApi<{ id: string; name: string; updatedAt: string }>(
      `/api/resumes/${id}/name`,
      {
        method: 'PUT',
        body: { name }
      }
    );
  },

  /**
   * Set which resume is the user's default
   */
  async setDefault(resumeId: string): Promise<{ success: true }> {
    return await useApi<{ success: true }>('/api/user/default-resume', {
      method: 'PUT',
      body: { resumeId }
    });
  },

  /**
   * Get per-resume format settings (auto-seeds defaults)
   */
  async fetchFormatSettings(
    resumeId: string
  ): Promise<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }> {
    return await useApi<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }>(
      `/api/resumes/${resumeId}/format-settings`,
      { method: 'GET' }
    );
  },

  /**
   * Patch per-resume format settings (deep partial merge)
   */
  async patchFormatSettings(
    resumeId: string,
    patch: PatchFormatSettingsBody
  ): Promise<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }> {
    return await useApi<{ ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }>(
      `/api/resumes/${resumeId}/format-settings`,
      { method: 'PATCH', body: patch }
    );
  },

  // ============================================
  // Legacy Endpoints (deprecated, kept for compat)
  // ============================================

  /**
   * @deprecated Use fetchById() instead
   * Get the current user's default resume
   * Returns null if user has no resume
   */
  async fetch(): Promise<Resume | null> {
    try {
      return await useApi<Resume>('/api/resume', {
        method: 'GET'
      });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * @deprecated Use multi-resume upload flow instead
   * Upload and parse a resume file
   * Creates a new resume (no longer upserts)
   */
  async upload(file: File, title?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    return await useApi<Resume>('/api/resume', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * @deprecated Use multi-resume creation flow instead
   * Create a resume from JSON content (manual creation)
   */
  async createFromContent(content: ResumeContent, title?: string): Promise<Resume> {
    return await useApi<Resume>('/api/resume', {
      method: 'POST',
      body: { content, title }
    });
  },

  /**
   * Update resume content (uses singular /api/resume)
   */
  async update(data: { content?: ResumeContent; title?: string }): Promise<Resume> {
    return await useApi<Resume>('/api/resume', {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Update resume content only
   */
  async updateContent(content: ResumeContent): Promise<Resume> {
    return resumeApi.update({ content });
  }
};
