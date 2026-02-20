import type {
  ExportFormat,
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  ResumeListItem
} from '@int/schema';
import type { ResumeWithFormatSettings } from '@site/resume/app/infrastructure/resume.api';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';
import { RESUME_EDITOR_TABS_MAP } from '../constants';

/**
 * Resume Store
 *
 * Manages user's resumes with editing state.
 * Format settings are managed per-resume within this store.
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
  resume: ResumeWithFormatSettings;
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

    // Fallback settings when active resume is not loaded
    defaultFormatSettings: {
      ats: ResumeFormatSettingsAts;
      human: ResumeFormatSettingsHuman;
    };
    previewType: ExportFormat;

    // UI state
    activeTab: EditorTab;
  } => {
    const defaults = useFormatSettingsDefaults();

    return {
      // Internal save guard for content persistence
      isContentSaveInProgress: false,
      contentSaveEpoch: 0,

      // Active resume
      activeResumeId: null,

      // Resume list
      resumeList: [],

      // Cached resumes for editing
      cachedResumes: [],

      // Fallback settings
      defaultFormatSettings: structuredClone(defaults),
      previewType: EXPORT_FORMAT_MAP.ATS,

      // UI state
      activeTab: RESUME_EDITOR_TABS_MAP.EDIT
    };
  },

  getters: {
    cachedResumesList: (state): CachedResume[] => state.cachedResumes,
    getActiveTab: (state): EditorTab => state.activeTab,
    getPreviewType: (state): ExportFormat => state.previewType,
    getCurrentSettings(state): ResumeFormatSettingsAts | ResumeFormatSettingsHuman {
      const settings = this.activeResume?.formatSettings ?? state.defaultFormatSettings;
      return state.previewType === EXPORT_FORMAT_MAP.ATS ? settings.ats : settings.human;
    },
    getAtsSettings(state): ResumeFormatSettingsAts {
      return this.activeResume?.formatSettings.ats ?? state.defaultFormatSettings.ats;
    },
    getHumanSettings(state): ResumeFormatSettingsHuman {
      return this.activeResume?.formatSettings.human ?? state.defaultFormatSettings.human;
    },

    /**
     * Get the active cached resume (by activeResumeId)
     */
    activeResume(state): ResumeWithFormatSettings | null {
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
    async fetchResumeById(
      id: string,
      options: { force?: boolean } = {}
    ): Promise<ResumeWithFormatSettings> {
      const cachedResume = this.cachedResumes.find(entry => entry.id === id)?.resume;
      if (cachedResume && !options.force) {
        this.activeResumeId = id;
        return cachedResume;
      }

      const payload = await resumeApi.fetchById(id);
      this._upsertCachedResume(payload);
      this.activeResumeId = payload.id;
      return payload;
    },

    /**
     * Upload and parse a resume file
     */
    async uploadResume(
      file: File,
      title?: string,
      replaceResumeId?: string
    ): Promise<ResumeWithFormatSettings> {
      const resume = await resumeApi.upload(file, title, replaceResumeId);
      const fullResume = await this.fetchResumeById(resume.id, { force: true });

      // Refresh resume list after upload
      await this.fetchResumeList();

      return fullResume;
    },

    /**
     * Create resume from content (manual creation)
     */
    async createFromContent(
      content: ResumeContent,
      title?: string,
      replaceResumeId?: string
    ): Promise<ResumeWithFormatSettings> {
      const resume = await resumeApi.createFromContent(content, title, replaceResumeId);
      const fullResume = await this.fetchResumeById(resume.id, { force: true });

      // Refresh resume list after creation
      await this.fetchResumeList();

      return fullResume;
    },

    // =========================================
    // Multi-Resume Actions
    // =========================================

    /**
     * Duplicate the current or specified resume
     */
    async duplicateResume(sourceId: string): Promise<ResumeWithFormatSettings> {
      const resume = await resumeApi.duplicate(sourceId);
      const fullResume = await this.fetchResumeById(resume.id, { force: true });

      // Refresh resume list to include new resume
      await this.fetchResumeList();

      return fullResume;
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
    // Format Settings Actions
    // =========================================

    /**
     * Set full settings snapshot (used by undo/redo restore).
     */
    setFullSettings(settings: {
      ats: ResumeFormatSettingsAts;
      human: ResumeFormatSettingsHuman;
    }): void {
      const activeResumeId = this.activeResumeId;
      if (!activeResumeId) return;

      const cached = this.cachedResumes.find(entry => entry.id === activeResumeId);
      if (!cached) return;

      cached.resume = {
        ...cached.resume,
        formatSettings: {
          ats: settings.ats,
          human: settings.human
        }
      };
    },

    /**
     * Update settings in store immediately (no network call).
     */
    updateSettings(partial: PatchFormatSettingsBody): void {
      const activeResumeId = this.activeResumeId;
      if (!activeResumeId) return;

      const cached = this.cachedResumes.find(entry => entry.id === activeResumeId);
      if (!cached) return;

      const currentSettings = cached.resume.formatSettings;

      const nextAts: ResumeFormatSettingsAts = {
        spacing: {
          ...currentSettings.ats.spacing,
          ...(partial.ats?.spacing ?? {})
        },
        localization: {
          ...currentSettings.ats.localization,
          ...(partial.ats?.localization ?? {})
        }
      };

      const nextHuman: ResumeFormatSettingsHuman = {
        spacing: {
          ...currentSettings.human.spacing,
          ...(partial.human?.spacing ?? {})
        },
        localization: {
          ...currentSettings.human.localization,
          ...(partial.human?.localization ?? {})
        }
      };

      cached.resume = {
        ...cached.resume,
        formatSettings: {
          ats: nextAts,
          human: nextHuman
        }
      };
    },

    /**
     * Persist settings to server via PATCH.
     */
    async patchSettings(partial: PatchFormatSettingsBody): Promise<void> {
      const resumeId = this.activeResumeId;
      if (!resumeId) {
        console.error('Cannot patch settings: no resume ID loaded');
        return;
      }

      const data = await resumeApi.patchSettings(resumeId, partial);
      const cached = this.cachedResumes.find(entry => entry.id === resumeId);
      if (!cached) return;

      cached.resume = {
        ...cached.resume,
        formatSettings: {
          ats: data.ats,
          human: data.human
        }
      };
    },

    /**
     * Fully replace settings on server (PATCH with full payload).
     */
    async putSettings(settings?: PutFormatSettingsBody): Promise<void> {
      const resumeId = this.activeResumeId;
      if (!resumeId) {
        console.error('Cannot put settings: no resume ID loaded');
        return;
      }

      const cached = this.cachedResumes.find(entry => entry.id === resumeId);
      if (!cached) return;

      const payload = settings ?? cached.resume.formatSettings;

      const data = await resumeApi.putSettings(resumeId, payload);
      cached.resume = {
        ...cached.resume,
        formatSettings: {
          ats: data.ats,
          human: data.human
        }
      };
    },

    /**
     * Set preview type (ats/human).
     */
    setPreviewType(type: ExportFormat): void {
      this.previewType = type;
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
    async saveContent(resumeId: string): Promise<ResumeWithFormatSettings | null> {
      const cached = this.cachedResumes.find(entry => entry.id === resumeId);
      const resume = cached?.resume;
      if (!resume) return null;

      const saveEpoch = this.contentSaveEpoch + 1;
      this.contentSaveEpoch = saveEpoch;
      this.isContentSaveInProgress = true;

      try {
        const updated = await resumeApi.updateContent(resumeId, resume.content);
        if (saveEpoch !== this.contentSaveEpoch) {
          return null;
        }

        const target = this.cachedResumes.find(entry => entry.id === resumeId);
        if (!target) {
          return null;
        }

        target.resume = {
          ...target.resume,
          ...updated,
          formatSettings: target.resume.formatSettings
        };

        return target.resume;
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
    _upsertCachedResume(resume: ResumeWithFormatSettings): void {
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
      this.previewType = EXPORT_FORMAT_MAP.ATS;
      this.activeTab = RESUME_EDITOR_TABS_MAP.EDIT;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
