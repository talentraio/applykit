/**
 * Resumes Composable (Legacy Compatibility Layer)
 *
 * Thin proxy over resume store for backward compatibility.
 * New code should use useResume() instead.
 *
 * Single resume architecture: one resume per user.
 *
 * T078 [US2] useResumes composable
 * TR007 - Refactored to use store instead of direct $fetch
 * T028 [US3] Updated for single-resume architecture
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
   * @deprecated Single resume architecture - use useResume().resume instead
   * Returns array with single resume for backward compatibility
   */
  resumes: ComputedRef<Resume[]>;

  /**
   * Current resume (same as store.resume)
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
   * Check if user has a resume
   */
  hasResumes: ComputedRef<boolean>;

  /**
   * Fetch user's resume
   */
  fetchResumes: () => Promise<Resume | null>;

  /**
   * @deprecated Use fetchResumes() - single resume architecture
   */
  fetchResume: (id: string) => Promise<Resume | null>;

  /**
   * Upload and parse a resume file
   */
  uploadResume: (file: File, title?: string) => Promise<Resume>;

  /**
   * @deprecated Use useResume().updateContent() instead
   */
  updateResume: (id: string, data: { content?: ResumeContent; title?: string }) => Promise<Resume>;

  /**
   * @deprecated Not supported in single-resume architecture
   */
  deleteResume: (id: string) => Promise<void>;
};

export function useResumes(): UseResumesReturn {
  const store = useResumeStore();

  return {
    // Computed refs from store state
    // Wrap single resume in array for backward compatibility
    resumes: computed(() => (store.resume ? [store.resume] : [])),
    current: computed(() => store.resume),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasResumes: computed(() => store.hasResume),

    // Proxy to store actions
    fetchResumes: () => store.fetchResume(),
    fetchResume: (_id: string) => store.fetchResume(), // ID ignored in single-resume architecture
    uploadResume: (file: File, title?: string) => store.uploadResume(file, title),
    updateResume: async (_id: string, data: { content?: ResumeContent; title?: string }) => {
      // Update content if provided
      if (data.content) {
        store.updateContent(data.content);
        const result = await store.saveContent();
        return result ?? store.resume!;
      }
      return store.resume!;
    },
    deleteResume: async (_id: string) => {
      // Not supported in single-resume architecture
      console.warn('deleteResume is not supported in single-resume architecture');
    }
  };
}
