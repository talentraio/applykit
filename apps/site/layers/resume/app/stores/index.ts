import type { Resume, ResumeContent, ResumeListItem } from '@int/schema';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';
import { RESUME_EDITOR_TABS_MAP } from '../constants';

/**
 * Resume Store
 *
 * Manages user's resumes with editing state.
 * Format settings are managed by useFormatSettingsStore in _base layer.
 * Undo/redo history is managed by useResumeEditHistory composable.
 *
 * Multi-resume architecture: up to 10 resumes per user.
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
    contentSaveEpoch: number;

    // Active resume ID (currently being edited)
    activeResumeId: string | null;

    // Lightweight resume list for selector
    resumeList: ResumeListItem[];

    // Cached resumes for editing (max 20)
    cachedResumes: CachedResume[];

    // UI state
    activeTab: EditorTab;
  } => ({
    // Internal save guard for content persistence
    isContentSaveInProgress: false,
    contentSaveEpoch: 0,

    // Active resume
    activeResumeId: null,

    // Resume list
    resumeList: [],

    // Cached resumes for editing
    cachedResumes: [],

    // UI state
    activeTab: RESUME_EDITOR_TABS_MAP.EDIT
  }),

  getters: {
    cachedResumesList: (state): CachedResume[] => state.cachedResumes,
    getActiveTab: (state): EditorTab => state.activeTab,

    /**
     * Get the active cached resume (by activeResumeId)
     */
    activeResume(state): Resume | null {
      if (!state.activeResumeId) return null;
      const cached = state.cachedResumes.find(c => c.id === state.activeResumeId);
      return cached?.resume ?? null;
    },

    /**
     * Whether there are multiple resumes
     */
    hasMultipleResumes(state): boolean {
      return state.resumeList.length > 1;
    },

    /**
     * Get the default resume ID from the resume list
     */
    defaultResumeId(state): string | null {
      const defaultItem = state.resumeList.find(r => r.isDefault);
      return defaultItem?.id ?? null;
    }
  },

  actions: {
    // =========================================
    // Data Loading Actions
    // =========================================

    /**
     * Fetch resume list (lightweight, for selector)
     */
    async fetchResumeList(): Promise<ResumeListItem[]> {
      const data = await resumeApi.fetchList();
      this.resumeList = data.items;
      return data.items;
    },

    /**
     * Fetch a specific resume by ID and cache it
     */
    async fetchResumeById(id: string): Promise<Resume> {
      const resume = await resumeApi.fetchById(id);
      this._upsertCachedResume(resume);
      this.activeResumeId = resume.id;
      return resume;
    },

    /**
     * Fetch user's default/latest resume (legacy, uses singular endpoint)
     */
    async fetchResume(): Promise<Resume | null> {
      const resume = await resumeApi.fetch();

      if (resume) {
        this._upsertCachedResume(resume);
        this.activeResumeId = resume.id;
      }

      return resume;
    },

    /**
     * Upload and parse a resume file
     */
    async uploadResume(file: File, title?: string): Promise<Resume> {
      const resume = await resumeApi.upload(file, title);
      this._upsertCachedResume(resume);
      this.activeResumeId = resume.id;

      // Refresh resume list after upload
      await this.fetchResumeList();

      return resume;
    },

    /**
     * Create resume from content (manual creation)
     */
    async createFromContent(content: ResumeContent, title?: string): Promise<Resume> {
      const resume = await resumeApi.createFromContent(content, title);
      this._upsertCachedResume(resume);
      this.activeResumeId = resume.id;

      // Refresh resume list after creation
      await this.fetchResumeList();

      return resume;
    },

    // =========================================
    // Multi-Resume Actions
    // =========================================

    /**
     * Duplicate the current or specified resume
     */
    async duplicateResume(sourceId: string): Promise<Resume> {
      const resume = await resumeApi.duplicate(sourceId);
      this._upsertCachedResume(resume);

      // Refresh resume list to include new resume
      await this.fetchResumeList();

      return resume;
    },

    /**
     * Delete a non-default resume
     */
    async deleteResume(id: string): Promise<void> {
      await resumeApi.deleteResume(id);

      // Remove from cache
      this.cachedResumes = this.cachedResumes.filter(c => c.id !== id);

      // Refresh resume list
      await this.fetchResumeList();

      // If deleted resume was active, clear active
      if (this.activeResumeId === id) {
        this.activeResumeId = null;
      }
    },

    /**
     * Set a resume as the default
     */
    async setDefaultResume(resumeId: string): Promise<void> {
      await resumeApi.setDefault(resumeId);

      // Update resume list to reflect new default
      this.resumeList = this.resumeList.map(r => ({
        ...r,
        isDefault: r.id === resumeId
      }));

      // Update cached resume isDefault if present
      for (const cached of this.cachedResumes) {
        cached.resume = {
          ...cached.resume,
          isDefault: cached.id === resumeId
        };
      }
    },

    /**
     * Update resume name
     */
    async updateResumeName(id: string, name: string): Promise<void> {
      const result = await resumeApi.updateName(id, name);

      // Update in resume list
      const listItem = this.resumeList.find(r => r.id === id);
      if (listItem) {
        listItem.name = result.name;
      }

      // Update in cache
      const cached = this.cachedResumes.find(c => c.id === id);
      if (cached) {
        cached.resume = {
          ...cached.resume,
          name: result.name
        };
      }
    },

    /**
     * Set active resume ID
     */
    setActiveResumeId(id: string | null): void {
      this.activeResumeId = id;
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

      const saveEpoch = this.contentSaveEpoch + 1;
      this.contentSaveEpoch = saveEpoch;
      this.isContentSaveInProgress = true;

      try {
        const updated = await resumeApi.updateContent(resume.content);
        if (saveEpoch !== this.contentSaveEpoch) {
          return null;
        }
        this._upsertCachedResume(updated);
        return updated;
      } finally {
        if (saveEpoch === this.contentSaveEpoch) {
          this.isContentSaveInProgress = false;
        }
      }
    },

    /**
     * Invalidate in-flight content save operations.
     * Used by discard flow so stale autosave responses are ignored.
     */
    invalidateContentSaves(): void {
      this.contentSaveEpoch += 1;
      this.isContentSaveInProgress = false;
    },

    // =========================================
    // Cache Management
    // =========================================

    /**
     * Upsert resume in cache (multi-resume aware)
     */
    _upsertCachedResume(resume: Resume): void {
      const index = this.cachedResumes.findIndex(c => c.id === resume.id);
      if (index >= 0) {
        this.cachedResumes[index] = {
          id: resume.id,
          resume: structuredClone(resume)
        };
      } else {
        // Keep max 20 cached resumes
        if (this.cachedResumes.length >= 20) {
          this.cachedResumes.pop();
        }
        this.cachedResumes.unshift({
          id: resume.id,
          resume: structuredClone(resume)
        });
      }
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
      this.resumeList = [];
      this.activeResumeId = null;
      this.isContentSaveInProgress = false;
      this.contentSaveEpoch = 0;
      this.activeTab = RESUME_EDITOR_TABS_MAP.EDIT;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
