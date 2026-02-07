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
 * Shared user-level format settings store in _base layer.
 * Lazy-loads settings from server, persists changes via throttled PATCH.
 * Consumed by resume and vacancy layers.
 */

export const useFormatSettingsStore = defineStore('FormatSettingsStore', {
  state: (): {
    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
    previewType: ExportFormat;
    loading: boolean;
    loaded: boolean;
  } => {
    const defaults = useFormatSettingsDefaults();

    return {
      ats: structuredClone(defaults.ats),
      human: structuredClone(defaults.human),
      previewType: EXPORT_FORMAT_MAP.ATS,
      loading: false,
      loaded: false
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
     * Fetch settings from server (lazy — skip if already loaded)
     */
    async fetchSettings(): Promise<void> {
      if (this.loaded || this.loading) return;

      this.loading = true;
      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>('/api/user/format-settings', { method: 'GET' });
        this.ats = data.ats;
        this.human = data.human;
        this.loaded = true;
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
      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>('/api/user/format-settings', {
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
     * Fully replace settings on server via PUT
     * Used by history restore/undo/redo flows.
     */
    async putSettings(settings?: PutFormatSettingsBody): Promise<void> {
      const payload = settings ?? {
        ats: this.ats,
        human: this.human
      };

      try {
        const data = await useApi<{
          ats: ResumeFormatSettingsAts;
          human: ResumeFormatSettingsHuman;
        }>('/api/user/format-settings', {
          method: 'PUT',
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
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFormatSettingsStore, import.meta.hot));
}
