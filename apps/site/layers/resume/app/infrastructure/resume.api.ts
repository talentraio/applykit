import type { Resume, ResumeContent } from '@int/schema';

/**
 * Resume API
 *
 * Handles resume operations using the new singular /api/resume endpoint.
 * Single resume architecture: one resume per user.
 *
 * Legacy /api/resumes/* endpoints are deprecated.
 *
 * Related: T028 (US3)
 */
export const resumeApi = {
  /**
   * Get the current user's single resume
   * Returns null if user has no resume
   */
  async fetch(): Promise<Resume | null> {
    try {
      return await useApi('/api/resume', {
        method: 'GET'
      });
    } catch (error) {
      // 404 means no resume exists yet
      if ((error as { statusCode?: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Upload and parse a resume file
   * Creates or replaces the user's single resume
   */
  async upload(file: File, title?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    return await useApi('/api/resume', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Create a resume from JSON content (manual creation)
   */
  async createFromContent(content: ResumeContent, title?: string): Promise<Resume> {
    return await useApi('/api/resume', {
      method: 'POST',
      body: { content, title }
    });
  },

  /**
   * Update resume content
   * Creates a version snapshot on content change
   */
  async update(data: { content?: ResumeContent; title?: string }): Promise<Resume> {
    return await useApi('/api/resume', {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Update resume content only
   */
  async updateContent(content: ResumeContent): Promise<Resume> {
    return resumeApi.update({ content });
  },

  // ============================================
  // DEPRECATED: Legacy /api/resumes/* endpoints
  // ============================================

  /**
   * @deprecated Use fetch() instead
   */
  async fetchAll(): Promise<Resume[]> {
    return await useApi('/api/resumes', {
      method: 'GET'
    });
  },

  /**
   * @deprecated Use fetch() instead
   */
  async fetchById(id: string): Promise<Resume> {
    return await useApi(`/api/resumes/${id}`, {
      method: 'GET'
    });
  },

  /**
   * @deprecated Use update() instead
   */
  async updateLegacy(
    id: string,
    data: { content?: ResumeContent; title?: string }
  ): Promise<Resume> {
    return await useApi(`/api/resumes/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * @deprecated Resume deletion not supported in single-resume architecture
   */
  async delete(id: string): Promise<void> {
    await useApi(`/api/resumes/${id}`, {
      method: 'DELETE'
    });
  }
};
