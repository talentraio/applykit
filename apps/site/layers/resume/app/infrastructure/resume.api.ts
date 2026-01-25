import type { Resume, ResumeContent } from '@int/schema';

const resumeUrl = '/api/resumes';

/**
 * Resume API
 *
 * Handles resume CRUD operations.
 * Site-specific - only used by site app.
 * Used by user store actions.
 *
 * TR003 - Created as part of architecture refactoring
 */
export const resumeApi = {
  /**
   * Fetch all resumes for current user
   */
  async fetchAll(): Promise<Resume[]> {
    return await useApi(resumeUrl, {
      method: 'GET'
    });
  },

  /**
   * Fetch a single resume by ID
   */
  async fetchById(id: string): Promise<Resume> {
    return await useApi(`${resumeUrl}/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Upload and parse a resume file
   * Returns parsed resume with LLM-extracted content
   */
  async upload(file: File, title?: string): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    return await useApi(resumeUrl, {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Update resume content or title
   */
  async update(id: string, data: { content?: ResumeContent; title?: string }): Promise<Resume> {
    return await useApi(`${resumeUrl}/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Delete a resume
   */
  async delete(id: string): Promise<void> {
    await useApi(`${resumeUrl}/${id}`, {
      method: 'DELETE'
    });
  }
};
