import type { Resume, ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { PreviewType } from '../types/preview';
import { resumeApi } from '@site/resume/app/infrastructure/resume.api';

/**
 * Resume Store
 *
 * Manages user's single resume with editing state, undo/redo history,
 * preview settings, and auto-save functionality.
 *
 * Single resume architecture: one resume per user.
 *
 * Related: T028, T029, T030 (US3)
 */

/**
 * Serializable error type for SSR hydration compatibility.
 */
type SerializableError = {
  message: string;
  statusCode?: number;
} | null;

/**
 * Editor tab types
 */
export type EditorTab = 'edit' | 'settings' | 'ai';

/**
 * History snapshot for undo/redo
 */
type HistorySnapshot = {
  content: ResumeContent;
  timestamp: number;
};

/**
 * Maximum history snapshots to keep
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Default format settings
 */
const DEFAULT_FORMAT_SETTINGS: ResumeFormatSettings = {
  margins: 20,
  fontSize: 12,
  lineHeight: 1.2,
  blockSpacing: 5
};

export const useResumeStore = defineStore('ResumeStore', {
  state: (): {
    // Server state
    resume: Resume | null;
    loading: boolean;
    saving: boolean;
    error: SerializableError;

    // Editing state
    editingContent: ResumeContent | null;
    isDirty: boolean;

    // Preview state
    previewType: PreviewType;
    atsSettings: ResumeFormatSettings;
    humanSettings: ResumeFormatSettings;

    // History for undo/redo
    history: HistorySnapshot[];
    historyIndex: number;

    // UI state
    activeTab: EditorTab;
  } => ({
    // Server state
    resume: null,
    loading: false,
    saving: false,
    error: null,

    // Editing state
    editingContent: null,
    isDirty: false,

    // Preview state
    previewType: 'ats',
    atsSettings: { ...DEFAULT_FORMAT_SETTINGS },
    humanSettings: { ...DEFAULT_FORMAT_SETTINGS },

    // History for undo/redo
    history: [],
    historyIndex: -1,

    // UI state
    activeTab: 'edit'
  }),

  getters: {
    /**
     * Check if user has a resume
     */
    hasResume: (state): boolean => state.resume !== null,

    /**
     * Get content for display (editing or original)
     */
    displayContent: (state): ResumeContent | null => {
      return state.editingContent ?? state.resume?.content ?? null;
    },

    /**
     * Get current format settings based on preview type
     */
    currentSettings: (state): ResumeFormatSettings => {
      return state.previewType === 'ats' ? state.atsSettings : state.humanSettings;
    },

    /**
     * Check if undo is available
     */
    canUndo: (state): boolean => state.historyIndex > 0,

    /**
     * Check if redo is available
     */
    canRedo: (state): boolean => state.historyIndex < state.history.length - 1,

    /**
     * Get history length for display
     */
    historyLength: (state): number => state.history.length
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
        this.resume = resume;

        if (resume) {
          // Initialize editing state from server data
          this.editingContent = structuredClone(resume.content);
          this.atsSettings = resume.atsSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
          this.humanSettings = resume.humanSettings ?? { ...DEFAULT_FORMAT_SETTINGS };

          // Initialize history with current state
          this._initializeHistory(resume.content);
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
        this.resume = resume;

        // Initialize editing state
        this.editingContent = structuredClone(resume.content);
        this.atsSettings = resume.atsSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
        this.humanSettings = resume.humanSettings ?? { ...DEFAULT_FORMAT_SETTINGS };
        this.isDirty = false;

        // Initialize history
        this._initializeHistory(resume.content);

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
        this.resume = resume;

        // Initialize editing state
        this.editingContent = structuredClone(resume.content);
        this.isDirty = false;

        // Initialize history
        this._initializeHistory(resume.content);

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
     * Update editing content (local state only)
     * Call saveContent() to persist to server
     */
    updateContent(content: ResumeContent): void {
      this.editingContent = content;
      this.isDirty = true;
      this._pushToHistory(content);
    },

    /**
     * Update a specific field in editing content
     */
    updateField<K extends keyof ResumeContent>(field: K, value: ResumeContent[K]): void {
      if (!this.editingContent) return;

      this.editingContent = {
        ...this.editingContent,
        [field]: value
      };
      this.isDirty = true;
      this._pushToHistory(this.editingContent);
    },

    /**
     * Save content to server
     */
    async saveContent(): Promise<Resume | null> {
      if (!this.editingContent || !this.isDirty) return this.resume;

      this.saving = true;
      this.error = null;

      try {
        const resume = await resumeApi.updateContent(this.editingContent);
        this.resume = resume;
        this.isDirty = false;
        return resume;
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
    // Undo/Redo Actions (T029)
    // =========================================

    /**
     * Undo to previous state
     */
    undo(): void {
      if (!this.canUndo) return;

      this.historyIndex--;
      const snapshot = this.history[this.historyIndex];
      if (snapshot) {
        this.editingContent = structuredClone(snapshot.content);
        this.isDirty = true;
      }
    },

    /**
     * Redo to next state
     */
    redo(): void {
      if (!this.canRedo) return;

      this.historyIndex++;
      const snapshot = this.history[this.historyIndex];
      if (snapshot) {
        this.editingContent = structuredClone(snapshot.content);
        this.isDirty = true;
      }
    },

    /**
     * Initialize history with initial content
     */
    _initializeHistory(content: ResumeContent): void {
      this.history = [{ content: structuredClone(content), timestamp: Date.now() }];
      this.historyIndex = 0;
      this.isDirty = false;
    },

    /**
     * Push new snapshot to history
     */
    _pushToHistory(content: ResumeContent): void {
      // Remove any future states if we're not at the end
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      // Add new snapshot
      this.history.push({
        content: structuredClone(content),
        timestamp: Date.now()
      });
      this.historyIndex = this.history.length - 1;

      // Trim history if too large
      if (this.history.length > MAX_HISTORY_SIZE) {
        const trimCount = this.history.length - MAX_HISTORY_SIZE;
        this.history = this.history.slice(trimCount);
        this.historyIndex = Math.max(0, this.historyIndex - trimCount);
      }
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
    async saveSettings(): Promise<Resume | null> {
      if (!this.resume) return null;

      this.saving = true;
      this.error = null;

      try {
        const resume = await resumeApi.updateSettings({
          atsSettings: this.atsSettings,
          humanSettings: this.humanSettings
        });
        this.resume = resume;
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
     * Discard unsaved changes
     */
    discardChanges(): void {
      if (!this.resume) return;

      this.editingContent = structuredClone(this.resume.content);
      this._initializeHistory(this.resume.content);
      this.isDirty = false;
    },

    /**
     * Reset store state
     */
    $reset(): void {
      this.resume = null;
      this.editingContent = null;
      this.loading = false;
      this.saving = false;
      this.error = null;
      this.isDirty = false;
      this.previewType = 'ats';
      this.atsSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.humanSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.history = [];
      this.historyIndex = -1;
      this.activeTab = 'edit';
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useResumeStore, import.meta.hot));
}
