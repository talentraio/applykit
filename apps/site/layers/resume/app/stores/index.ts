import type { Resume, ResumeContent } from '@int/schema';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';
import { RESUME_EDITOR_TABS_MAP } from '../constants';

/**
 * Resume Store
 *
 * Manages user's resume with editing state.
 * Format settings are managed by useFormatSettingsStore in _base layer.
 * Undo/redo history is managed by useResumeEditHistory composable.
 *
 * Single resume architecture: one resume per user.
 */

/**
 * Editor tab types
 */
export type EditorTab = TValues<typeof RESUME_EDITOR_TABS_MAP>;

/**
 * Cached resume entry
 */
type CachedResume = {
  id: string;
  resume: Resume;
};

export const useResumeStore = defineStore('ResumeStore', {
  state: (): {
    // Internal save guard for content persistence
    isContentSaveInProgress: boolean;

    // Cached resumes for editing (max 20)
    cachedResumes: CachedResume[];

    // UI state
    activeTab: EditorTab;
  } => ({
    // Internal save guard for content persistence
    isContentSaveInProgress: false,

    // Cached resumes for editing
    cachedResumes: [],

    // UI state
    activeTab: RESUME_EDITOR_TABS_MAP.EDIT
  }),

  getters: {
    cachedResumesList: (state): CachedResume[] => state.cachedResumes,
    getActiveTab: (state): EditorTab => state.activeTab
  },

  actions: {
    // =========================================
    // Data Loading Actions
    // =========================================

    /**
     * Fetch user's single resume
     */
    async fetchResume(): Promise<Resume | null> {
      const resume = await resumeApi.fetch();

      if (resume) {
        this._upsertCachedResume(resume);
      }

      return resume;
    },

    /**
     * Upload and parse a resume file
     */
    async uploadResume(file: File, title?: string): Promise<Resume> {
      const resume = await resumeApi.upload(file, title);
      this._upsertCachedResume(resume);
      return resume;
    },

    /**
     * Create resume from content (manual creation)
     */
    async createFromContent(content: ResumeContent, title?: string): Promise<Resume> {
      const resume = await resumeApi.createFromContent(content, title);
      this._upsertCachedResume(resume);
      return resume;
    },

    // =========================================
    // Content Editing Actions
    // =========================================

    /**
     * Update content of current resume in cache
     */
    updateContent(content: ResumeContent, resumeId: string): void {
      const cached = this.cachedResumes.find(c => c.id === resumeId);
      if (cached) {
        cached.resume = {
          ...cached.resume,
          content
        };
      }
    },

    /**
     * Update a specific field in resume content
     */
    updateField<K extends keyof ResumeContent>(
      field: K,
      value: ResumeContent[K],
      resumeId: string
    ): void {
      const cached = this.cachedResumes.find(c => c.id === resumeId);
      if (cached?.resume.content) {
        cached.resume = {
          ...cached.resume,
          content: {
            ...cached.resume.content,
            [field]: value
          }
        };
      }
    },

    /**
     * Save content to server
     */
    async saveContent(resumeId: string): Promise<Resume | null> {
      const cached = this.cachedResumes.find(entry => entry.id === resumeId);
      const resume = cached?.resume;
      if (!resume) return null;

      this.isContentSaveInProgress = true;

      try {
        const updated = await resumeApi.updateContent(resume.content);
        this._upsertCachedResume(updated);
        return updated;
      } finally {
        this.isContentSaveInProgress = false;
      }
    },

    // =========================================
    // Cache Management
    // =========================================

    /**
     * Upsert resume in cache
     */
    _upsertCachedResume(resume: Resume): void {
      this.cachedResumes = this.cachedResumes.filter(c => c.id !== resume.id);
      this.cachedResumes = [
        {
          id: resume.id,
          resume: structuredClone(resume)
        }
      ];
    },

    // =========================================
    // UI State Actions
    // =========================================

    /**
     * Set active editor tab
     */
    setActiveTab(tab: EditorTab): void {
      this.activeTab = tab;
    },

    /**
     * Reset store state
     */
    $reset(): void {
      this.cachedResumes = [];
      this.isContentSaveInProgress = false;
      this.activeTab = RESUME_EDITOR_TABS_MAP.EDIT;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
