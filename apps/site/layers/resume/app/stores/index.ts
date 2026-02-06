import type { Resume, ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { SerializableError } from '@layer/api/types/serializable-error';
import type { PreviewType } from '../types/preview';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';
import { RESUME_EDITOR_TABS_MAP } from '../constants';

/**
 * Resume Store
 *
 * Manages user's resume with editing state and preview settings.
 * Uses cached resumes array for direct editing.
 * Undo/redo history is managed by useResumeEditHistory composable.
 *
 * Single resume architecture: one resume per user.
 *
 * Related: T028, T029, T030 (US3)
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

/**
 * Default format settings
 */
const DEFAULT_FORMAT_SETTINGS: ResumeFormatSettings = {
  marginX: 20,
  marginY: 15,
  fontSize: 12,
  lineHeight: 1.2,
  blockSpacing: 5
};

export const useResumeStore = defineStore('ResumeStore', {
  state: (): {
    // Server state
    loading: boolean;
    saving: boolean;
    error: SerializableError;

    // Cached resumes for editing (max 20)
    cachedResumes: CachedResume[];

    // Preview state
    previewType: PreviewType;
    atsSettings: ResumeFormatSettings;
    humanSettings: ResumeFormatSettings;

    // UI state
    activeTab: EditorTab;
  } => ({
    // Server state
    loading: false,
    saving: false,
    error: null,

    // Cached resumes for editing
    cachedResumes: [],

    // Preview state
    previewType: 'ats',
    atsSettings: { ...DEFAULT_FORMAT_SETTINGS },
    humanSettings: { ...DEFAULT_FORMAT_SETTINGS },

    // UI state
    activeTab: RESUME_EDITOR_TABS_MAP.EDIT
  }),

  getters: {
    /**
     * Get cached resumes list
     */
    cachedResumesList: (state): CachedResume[] => state.cachedResumes,

    /**
     * Get current format settings based on preview type
     */
    currentSettings: (state): ResumeFormatSettings => {
      return state.previewType === 'ats' ? state.atsSettings : state.humanSettings;
    },

    getPreviewType: (state): PreviewType => state.previewType,
    getAtsSettings: (state): ResumeFormatSettings => state.atsSettings,
    getHumanSettings: (state): ResumeFormatSettings => state.humanSettings,

    getLoading: (state): boolean => state.loading,
    getSaving: (state): boolean => state.saving,
    getLastError: (state): SerializableError => state.error,

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
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.fetch();

        if (resume) {
          // Add to cache and set as current
          this._addToCache(resume);

          // Initialize settings from server data
          this.atsSettings = resume.atsSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
          this.humanSettings = resume.humanSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
        }

        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Upload and parse a resume file
     */
    async uploadResume(file: File, title?: string): Promise<Resume> {
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.upload(file, title);

        // Add to cache and set as current
        this._addToCache(resume);

        // Initialize settings from server data
        this.atsSettings = resume.atsSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
        this.humanSettings = resume.humanSettings ?? { ...DEFAULT_FORMAT_SETTINGS };

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
     * Create resume from content (manual creation)
     */
    async createFromContent(content: ResumeContent, title?: string): Promise<Resume> {
      this.loading = true;
      this.error = null;

      try {
        const resume = await resumeApi.createFromContent(content, title);

        // Add to cache and set as current
        this._addToCache(resume);

        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.loading = false;
      }
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

      this.saving = true;
      this.error = null;

      try {
        const updated = await resumeApi.updateContent(resume.content);

        // Update in cache
        this._updateInCache(updated);

        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save resume';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.saving = false;
      }
    },

    // =========================================
    // Cache Management
    // =========================================

    /**
     * Add resume to cache
     */
    _addToCache(resume: Resume): void {
      // Remove from cache
      this.cachedResumes = this.cachedResumes.filter(c => c.id !== resume.id);
      this.cachedResumes = [
        {
          id: resume.id,
          resume: structuredClone(resume)
        }
      ];
    },

    /**
     * Update resume in cache
     */
    _updateInCache(resume: Resume): void {
      this._addToCache(resume);
    },

    // =========================================
    // Settings Actions
    // =========================================

    /**
     * Set preview type (ATS or Human)
     */
    setPreviewType(type: PreviewType): void {
      this.previewType = type;
    },

    /**
     * Update format settings for current preview type
     */
    updateSettings(settings: Partial<ResumeFormatSettings>): void {
      if (this.previewType === 'ats') {
        this.atsSettings = { ...this.atsSettings, ...settings };
      } else {
        this.humanSettings = { ...this.humanSettings, ...settings };
      }
    },

    /**
     * Save settings to server
     */
    async saveSettings(resumeId: string): Promise<Resume | null> {
      const cached = this.cachedResumes.find(entry => entry.id === resumeId);
      if (!cached) return null;

      this.saving = true;
      this.error = null;

      try {
        const resume = await resumeApi.updateSettings({
          atsSettings: this.atsSettings,
          humanSettings: this.humanSettings
        });

        // Update in cache
        this._updateInCache(resume);

        return resume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save settings';
        const statusCode = (err as { statusCode?: number }).statusCode;
        this.error = { message, statusCode };
        throw err;
      } finally {
        this.saving = false;
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
      this.loading = false;
      this.saving = false;
      this.error = null;
      this.previewType = 'ats';
      this.atsSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.humanSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.activeTab = RESUME_EDITOR_TABS_MAP.EDIT;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
