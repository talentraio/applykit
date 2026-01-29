import type { Resume, ResumeContent } from '@int/schema';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';

/**
 * Resume Store
 *
 * Manages user resumes data and operations.
 * Site-specific - uses resume.api.ts from resume layer.
 *
 * TR005 - Refactored from useUserStore (split from profile logic)
 */
/**
 * Serializable error type for SSR hydration compatibility.
 * Raw Error/FetchError objects can't be serialized by devalue.
 */
type SerializableError = {
  message: string;
  statusCode?: number;
} | null;

export const useResumeStore = defineStore('ResumeStore', {
  state: (): {
    resumes: Resume[];
    currentResume: Resume | null;
    loading: boolean;
    error: SerializableError;
  } => ({
    resumes: [],
    currentResume: null,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Check if user has any resumes
     */
    hasResumes: (state): boolean => state.resumes.length > 0,

    /**
     * Get the latest (most recent) resume
     */
    latestResume: (state): Resume | null => {
      if (state.resumes.length === 0) return null;
      const sorted = [...state.resumes].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return sorted[0] ?? null;
    }
  },

  actions: {
    /**
     * Fetch all resumes for current user
     * Returns data for useAsyncData compatibility
     */
    async fetchResumes(): Promise<Resume[]> {
      this.loading = true;
      this.error = null;

      try {
        const data = await resumeApi.fetchAll();
        this.resumes = data;
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch resumes';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch a single resume by ID
     * Returns data for useAsyncData compatibility
     */
    async fetchResume(id: string): Promise<Resume | null> {
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.fetchById(id);
        this.currentResume = resume;
        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        this.currentResume = null;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Upload and parse a resume file
     * Returns the created resume
     */
    async uploadResume(file: File, title?: string): Promise<Resume> {
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.upload(file, title);

        // Add to list at the beginning (most recent)
        this.resumes.unshift(resume);
        this.currentResume = resume;

        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update resume content or title
     * Returns the updated resume
     */
    async updateResume(
      id: string,
      data: { content?: ResumeContent; title?: string }
    ): Promise<Resume> {
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.update(id, data);

        // Update in list
        const index = this.resumes.findIndex(r => r.id === id);
        if (index !== -1) {
          this.resumes[index] = resume;
        }

        // Update current if it's the same resume
        if (this.currentResume?.id === id) {
          this.currentResume = resume;
        }

        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete a resume
     */
    async deleteResume(id: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await resumeApi.delete(id);

        // Remove from list
        this.resumes = this.resumes.filter(r => r.id !== id);

        // Clear current if it's the deleted resume
        if (this.currentResume?.id === id) {
          this.currentResume = null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.resumes = [];
      this.currentResume = null;
      this.loading = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
