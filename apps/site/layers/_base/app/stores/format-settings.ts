import type {
  ExportFormat,
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import { EXPORT_FORMAT_MAP } from '@int/schema';

/**
 * Format Settings Store
 *
 * Per-resume format settings store in _base layer.
 * Lazy-loads settings from server per resume ID, persists changes via throttled PATCH.
 * Consumed by resume and vacancy layers.
 */

export const useFormatSettingsStore = defineStore('FormatSettingsStore', {
  state: (): {
    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
    previewType: ExportFormat;
    loading: boolean;
    loaded: boolean;
    /** The resume ID these settings belong to */
    loadedResumeId: string | null;
  } => {
    const defaults = useFormatSettingsDefaults();

    return {
      ats: structuredClone(defaults.ats),
      human: structuredClone(defaults.human),
      previewType: EXPORT_FORMAT_MAP.ATS,
      loading: false,
      loaded: false,
      loadedResumeId: null
    };
  },

  getters: {
    getPreviewType(state): ExportFormat {
      return state.previewType;
    },
    getCurrentSettings(state): ResumeFormatSettingsAts | ResumeFormatSettingsHuman {
      return state.previewType === EXPORT_FORMAT_MAP.ATS ? state.ats : state.human;
    },
    getAtsSettings(state): ResumeFormatSettingsAts {
      return state.ats;
    },
    getHumanSettings(state): ResumeFormatSettingsHuman {
      return state.human;
    }
  },

  actions: {
    /**
     * Fetch settings from server for a specific resume.
     * Skips if already loaded for the same resumeId.
     * Forces reload if resumeId differs from currently loaded.
     */
    async fetchSettings(resumeId?: string): Promise<void> {
      // If no resumeId provided, use the currently loaded one (backward compat)
      const targetId = resumeId ?? this.loadedResumeId;
      if (!targetId) return;

      // Skip if already loaded for same resume
      if (this.loaded && this.loadedResumeId === targetId && !this.loading) return;

      // If loading for a different resume, reset loaded state
      if (this.loadedResumeId !== targetId) {
        this.loaded = false;
        this.loadedResumeId = targetId;
      }

      if (this.loading) return;

      this.loading = true;
      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>(`/api/resumes/${targetId}/format-settings`, { method: 'GET' });
        this.ats = data.ats;
        this.human = data.human;
        this.loaded = true;
        this.loadedResumeId = targetId;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update settings in store immediately (no network call)
     * Used for instant UI feedback before throttled PATCH
     */
    updateSettings(partial: PatchFormatSettingsBody): void {
      if (partial.ats?.spacing) {
        this.ats = {
          ...this.ats,
          spacing: { ...this.ats.spacing, ...partial.ats.spacing }
        };
      }
      if (partial.ats?.localization) {
        this.ats = {
          ...this.ats,
          localization: { ...this.ats.localization, ...partial.ats.localization }
        };
      }
      if (partial.human?.spacing) {
        this.human = {
          ...this.human,
          spacing: { ...this.human.spacing, ...partial.human.spacing }
        };
      }
      if (partial.human?.localization) {
        this.human = {
          ...this.human,
          localization: { ...this.human.localization, ...partial.human.localization }
        };
      }
    },

    /**
     * Persist settings to server via PATCH
     * Called by throttled wrapper for incremental settings changes
     */
    async patchSettings(partial: PatchFormatSettingsBody): Promise<void> {
      const resumeId = this.loadedResumeId;
      if (!resumeId) {
        console.error('Cannot patch settings: no resume ID loaded');
        return;
      }

      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>(`/api/resumes/${resumeId}/format-settings`, {
          method: 'PATCH',
          body: partial
        });
        // Update store with server response (source of truth)
        this.ats = data.ats;
        this.human = data.human;
      } catch (error) {
        console.error('Failed to save format settings:', error);
        throw error;
      }
    },

    /**
     * Fully replace settings on server via PUT (uses PATCH with full payload)
     * Used by history restore/undo/redo flows.
     */
    async putSettings(settings?: PutFormatSettingsBody): Promise<void> {
      const resumeId = this.loadedResumeId;
      if (!resumeId) {
        console.error('Cannot put settings: no resume ID loaded');
        return;
      }

      const payload = settings ?? {
        ats: this.ats,
        human: this.human
      };

      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>(`/api/resumes/${resumeId}/format-settings`, {
          method: 'PATCH',
          body: payload
        });
        this.ats = data.ats;
        this.human = data.human;
      } catch (error) {
        console.error('Failed to replace format settings:', error);
        throw error;
      }
    },

    /**
     * Set full settings (used by undo/redo to restore snapshot)
     */
    setFullSettings(settings: {
      ats: ResumeFormatSettingsAts;
      human: ResumeFormatSettingsHuman;
    }): void {
      this.ats = settings.ats;
      this.human = settings.human;
    },

    /**
     * Set the preview type (ats/human)
     */
    setPreviewType(type: ExportFormat): void {
      this.previewType = type;
    },

    /**
     * Invalidate loaded state (forces re-fetch on next fetchSettings)
     */
    invalidate(): void {
      this.loaded = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFormatSettingsStore, import.meta.hot));
}
