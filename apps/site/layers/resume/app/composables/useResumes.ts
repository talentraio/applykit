/**
 * Resumes Composable
 *
 * Thin proxy over resume store for convenient access in components.
 * Does NOT hold state - all state lives in useResumeStore.
 *
 * T078 [US2] useResumes composable
 * TR007 - Refactored to use store instead of direct $fetch
 *         Moved from @int/api to site/layers/resume (site-specific)
 */

import type { Resume, ResumeContent } from '@int/schema';

/**
 * Serializable error type for SSR hydration compatibility.
 */
type SerializableError = {
  message: string;
  statusCode?: number;
} | null;

export type UseResumesReturn = {
  /**
   * List of resumes (from store)
   */
  resumes: ComputedRef<Resume[]>;

  /**
   * Currently selected resume (from store)
   */
  current: ComputedRef<Resume | null>;

  /**
   * Loading state (from store)
   */
  loading: ComputedRef<boolean>;

  /**
   * Error state (from store)
   */
  error: ComputedRef<SerializableError>;

  /**
   * Check if user has any resumes
   */
  hasResumes: ComputedRef<boolean>;

  /**
   * Fetch all resumes
   */
  fetchResumes: () => Promise<Resume[]>;

  /**
   * Fetch a single resume by ID
   */
  fetchResume: (id: string) => Promise<Resume | null>;

  /**
   * Upload and parse a resume file
   */
  uploadResume: (file: File, title?: string) => Promise<Resume>;

  /**
   * Update resume content or title
   */
  updateResume: (id: string, data: { content?: ResumeContent; title?: string }) => Promise<Resume>;

  /**
   * Delete a resume
   */
  deleteResume: (id: string) => Promise<void>;
};

export function useResumes(): UseResumesReturn {
  const store = useResumeStore();

  return {
    // Computed refs from store state
    resumes: computed(() => store.resumes),
    current: computed(() => store.currentResume),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasResumes: computed(() => store.hasResumes),

    // Proxy to store actions
    fetchResumes: () => store.fetchResumes(),
    fetchResume: (id: string) => store.fetchResume(id),
    uploadResume: (file: File, title?: string) => store.uploadResume(file, title),
    updateResume: (id: string, data: { content?: ResumeContent; title?: string }) =>
      store.updateResume(id, data),
    deleteResume: (id: string) => store.deleteResume(id)
  };
}
