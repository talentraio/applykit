import type {
  ExportFormat,
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { generationApi } from '../infrastructure/generation.api';

/**
 * Generation Format Settings Store
 *
 * Per-generation format settings for vacancy generated resumes.
 * Separate from resume-level settings store to keep domain boundaries explicit.
 */
export const useGenerationFormatSettingsStore = defineStore('GenerationFormatSettingsStore', {
  state: (): {
    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
    previewType: ExportFormat;
  } => {
    const defaults = useFormatSettingsDefaults();

    return {
      ats: structuredClone(defaults.ats),
      human: structuredClone(defaults.human),
      previewType: EXPORT_FORMAT_MAP.ATS
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
     * Restore defaults.
     */
    resetSettings(): void {
      const defaults = useFormatSettingsDefaults();
      this.ats = structuredClone(defaults.ats);
      this.human = structuredClone(defaults.human);
    },

    /**
     * Update settings in store immediately (no network call).
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
     * Persist settings to server via PATCH.
     */
    async patchSettings(
      vacancyId: string,
      generationId: string,
      partial: PatchFormatSettingsBody
    ): Promise<void> {
      const data = await generationApi.patchFormatSettings(vacancyId, generationId, partial);
      this.ats = data.ats;
      this.human = data.human;
    },

    /**
     * Replace settings on server with a full payload.
     */
    async putSettings(
      vacancyId: string,
      generationId: string,
      settings?: PutFormatSettingsBody
    ): Promise<void> {
      const payload: PutFormatSettingsBody = settings ?? {
        ats: this.ats,
        human: this.human
      };

      const data = await generationApi.putFormatSettings(vacancyId, generationId, payload);
      this.ats = data.ats;
      this.human = data.human;
    },

    /**
     * Set full settings snapshot (used by history undo/redo).
     */
    setFullSettings(settings: {
      ats: ResumeFormatSettingsAts;
      human: ResumeFormatSettingsHuman;
    }): void {
      this.ats = settings.ats;
      this.human = settings.human;
    },

    /**
     * Set preview type (ats/human).
     */
    setPreviewType(type: ExportFormat): void {
      this.previewType = type;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGenerationFormatSettingsStore, import.meta.hot));
}
