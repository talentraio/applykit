import type {
  ExportFormat,
  Generation,
  PatchFormatSettingsBody,
  PutFormatSettingsBody,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman
} from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';
import type { GenerateOptions } from '@site/vacancy/app/infrastructure/generation.api';
import { EXPORT_FORMAT_MAP } from '@int/schema';
import { generationApi } from '@site/vacancy/app/infrastructure/generation.api';

const MAX_CACHED_GENERATIONS = 20;

const createDefaultFormatSettings = (): {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
} => {
  const defaults = useFormatSettingsDefaults();

  return {
    ats: structuredClone(defaults.ats),
    human: structuredClone(defaults.human)
  };
};

const getGenerationTimestamp = (generation: Generation): number => {
  return new Date(generation.generatedAt).getTime();
};

const resolveLatestGenerationByVacancy = (generations: Generation[], vacancyId: string) => {
  const vacancyGenerations = generations.filter(entry => entry.vacancyId === vacancyId);
  if (vacancyGenerations.length === 0) return null;

  return vacancyGenerations.reduce<Generation | null>((currentLatest, current) => {
    if (!currentLatest) return current;
    return getGenerationTimestamp(current) > getGenerationTimestamp(currentLatest)
      ? current
      : currentLatest;
  }, vacancyGenerations[0] ?? null);
};

export const useVacancyResumeGenerationStore = defineStore('VacancyResumeGenerationStore', {
  state: (): {
    activeVacancyId: string | null;
    generations: Generation[];
    generatingVacancyIds: string[];
    savingGeneration: boolean;
    generationSaveEpoch: number;

    isEditingGeneration: boolean;

    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
    previewType: ExportFormat;
  } => {
    const defaults = createDefaultFormatSettings();

    return {
      activeVacancyId: null,
      generations: [],
      generatingVacancyIds: [],
      savingGeneration: false,
      generationSaveEpoch: 0,

      isEditingGeneration: false,

      ats: defaults.ats,
      human: defaults.human,
      previewType: EXPORT_FORMAT_MAP.ATS
    };
  },

  getters: {
    getGenerations: (state): Generation[] => state.generations,

    getCurrentGeneration: (state): Generation | null => {
      if (!state.activeVacancyId) return null;
      return resolveLatestGenerationByVacancy(state.generations, state.activeVacancyId);
    },

    getHasGeneration(): boolean {
      return this.getCurrentGeneration !== null;
    },

    getGenerating: (state): boolean => {
      if (!state.activeVacancyId) return false;
      return state.generatingVacancyIds.includes(state.activeVacancyId);
    },

    getGeneratingVacancyIds: (state): string[] => state.generatingVacancyIds,

    getSavingGeneration: (state): boolean => state.savingGeneration,

    // Keep compatibility with current composables/history contract.
    getCurrentGenerationId(): string | null {
      return this.getCurrentGeneration?.id ?? null;
    },

    getDisplayGenerationContent(): ResumeContent | null {
      return this.getCurrentGeneration?.content ?? null;
    },

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
    _ensureVacancyContext(vacancyId: string): void {
      if (this.activeVacancyId !== vacancyId) {
        this.activeVacancyId = vacancyId;
        this.generationSaveEpoch += 1;
        this.savingGeneration = false;
      }
    },

    _removeGenerationsByVacancyId(vacancyId: string): void {
      this.generations = this.generations.filter(entry => entry.vacancyId !== vacancyId);
    },

    _upsertGeneration(generation: Generation): void {
      const index = this.generations.findIndex(entry => entry.id === generation.id);

      if (index !== -1) {
        this.generations[index] = structuredClone(generation);
        return;
      }

      this.generations.unshift(structuredClone(generation));

      if (this.generations.length > MAX_CACHED_GENERATIONS) {
        this.generations = this.generations.slice(0, MAX_CACHED_GENERATIONS);
      }
    },

    _startGenerating(vacancyId: string): void {
      if (this.generatingVacancyIds.includes(vacancyId)) {
        return;
      }

      this.generatingVacancyIds.push(vacancyId);
    },

    _finishGenerating(vacancyId: string): void {
      this.generatingVacancyIds = this.generatingVacancyIds.filter(item => item !== vacancyId);
    },

    async generateResume(vacancyId: string, options?: GenerateOptions): Promise<Generation> {
      this._ensureVacancyContext(vacancyId);
      this._startGenerating(vacancyId);

      try {
        const generation = await generationApi.generate(vacancyId, options);
        this._upsertGeneration(generation);

        const vacancyStore = useVacancyStore();
        vacancyStore.markResumeGenerated(vacancyId, generation);

        try {
          await vacancyStore.fetchVacancyMeta(vacancyId);
        } catch (error) {
          console.warn(
            `[VacancyResumeGenerationStore] Failed to refresh vacancy meta after generation: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }

        return generation;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to generate resume');
      } finally {
        this._finishGenerating(vacancyId);
      }
    },

    async fetchGenerations(vacancyId: string): Promise<Generation[]> {
      this._ensureVacancyContext(vacancyId);

      try {
        const data = await generationApi.fetchAll(vacancyId);
        const currentVacancyGenerations = data.map(entry => structuredClone(entry));
        const otherVacancyGenerations = this.generations.filter(
          entry => entry.vacancyId !== vacancyId
        );

        this.generations = [...currentVacancyGenerations, ...otherVacancyGenerations];

        if (this.generations.length > MAX_CACHED_GENERATIONS) {
          this.generations = this.generations.slice(0, MAX_CACHED_GENERATIONS);
        }
        return data;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch generations');
      }
    },

    async fetchLatestGeneration(vacancyId: string): Promise<VacanciesResumeGeneration> {
      this._ensureVacancyContext(vacancyId);

      try {
        const payload = await generationApi.fetchLatest(vacancyId);

        if (payload.generation) {
          this._upsertGeneration(payload.generation);
        } else {
          this._removeGenerationsByVacancyId(vacancyId);
        }

        return payload;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch latest generation');
      }
    },

    async persistGenerationContent(
      vacancyId: string,
      generationId: string,
      content: ResumeContent
    ): Promise<Generation | null> {
      this._ensureVacancyContext(vacancyId);

      const saveEpoch = this.generationSaveEpoch + 1;
      this.generationSaveEpoch = saveEpoch;
      this.savingGeneration = true;

      try {
        const updated = await generationApi.updateContent(vacancyId, generationId, content);
        if (saveEpoch !== this.generationSaveEpoch) {
          return null;
        }

        this._upsertGeneration(updated);

        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update generation');
      } finally {
        if (saveEpoch === this.generationSaveEpoch) {
          this.savingGeneration = false;
        }
      }
    },

    invalidateGenerationSaves(): void {
      this.generationSaveEpoch += 1;
      this.savingGeneration = false;
    },

    updateGenerationContent(content: ResumeContent): void {
      const generationId = this.getCurrentGenerationId;
      if (!generationId) return;

      const generation = this.generations.find(entry => entry.id === generationId);
      if (!generation) return;

      this.generations = this.generations.map(entry =>
        entry.id === generationId
          ? {
              ...generation,
              content
            }
          : entry
      );
    },

    updateGenerationField<K extends keyof ResumeContent>(field: K, value: ResumeContent[K]): void {
      const generationId = this.getCurrentGenerationId;
      if (!generationId) return;

      const generation = this.generations.find(entry => entry.id === generationId);
      if (!generation) return;

      this.generations = this.generations.map(entry =>
        entry.id === generationId
          ? {
              ...generation,
              content: {
                ...generation.content,
                [field]: value
              }
            }
          : entry
      );
    },

    async saveGenerationContent(vacancyId: string): Promise<Generation | null> {
      this._ensureVacancyContext(vacancyId);

      const currentGeneration = this.getCurrentGeneration;
      if (!currentGeneration) return null;

      return this.persistGenerationContent(
        vacancyId,
        currentGeneration.id,
        currentGeneration.content
      );
    },

    async discardGenerationChanges(vacancyId: string): Promise<void> {
      this._ensureVacancyContext(vacancyId);
      await this.fetchLatestGeneration(vacancyId);
    },

    startEditingGeneration(): void {
      this.isEditingGeneration = true;
    },

    stopEditingGeneration(): void {
      this.isEditingGeneration = false;
    },

    resetSettings(): void {
      const defaults = createDefaultFormatSettings();
      this.ats = defaults.ats;
      this.human = defaults.human;
    },

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

    async patchSettings(
      vacancyId: string,
      generationId: string,
      partial: PatchFormatSettingsBody
    ): Promise<void> {
      const data = await generationApi.patchFormatSettings(vacancyId, generationId, partial);
      this.ats = data.ats;
      this.human = data.human;
    },

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

    setFullSettings(settings: {
      ats: ResumeFormatSettingsAts;
      human: ResumeFormatSettingsHuman;
    }): void {
      this.ats = settings.ats;
      this.human = settings.human;
    },

    setPreviewType(type: ExportFormat): void {
      this.previewType = type;
    },

    $reset(): void {
      const defaults = createDefaultFormatSettings();

      this.activeVacancyId = null;
      this.generations = [];
      this.generatingVacancyIds = [];
      this.savingGeneration = false;
      this.generationSaveEpoch = 0;

      this.isEditingGeneration = false;

      this.ats = defaults.ats;
      this.human = defaults.human;
      this.previewType = EXPORT_FORMAT_MAP.ATS;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyResumeGenerationStore, import.meta.hot));
}
