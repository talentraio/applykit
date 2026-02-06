import type {
  Generation,
  ResumeContent,
  ResumeFormatSettings,
  Vacancy,
  VacancyInput,
  VacancyStatus
} from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';
import type { GenerateOptions } from '@site/vacancy/app/infrastructure/generation.api';
import { generationApi } from '@site/vacancy/app/infrastructure/generation.api';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';

/**
 * Vacancy Store
 *
 * Manages vacancy data and operations.
 * Site-specific - uses vacancy.api.ts from vacancy layer.
 *
 * Generation editing uses cached generations array with direct editing.
 * Undo/redo history is managed by useResumeEditHistory composable.
 *
 * Related: T097 (US4), T043, T044 (US4)
 */

/**
 * Preview type for generation editing
 */
type PreviewType = 'ats' | 'human';

/**
 * Cached generation entry
 */
type CachedGeneration = {
  id: string;
  generation: Generation;
};

/**
 * Max cached generations
 */
const MAX_CACHED_GENERATIONS = 20;

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

export const useVacancyStore = defineStore('VacancyStore', {
  state: (): {
    vacancies: Vacancy[];
    currentVacancy: Vacancy | null;
    loading: boolean;
    error: Error | null;

    // Generation state
    generations: Generation[];
    latestGeneration: Generation | null;
    generationLoading: boolean;
    generating: boolean;
    savingGeneration: boolean;

    // Cached generations for editing (max 20)
    cachedGenerations: CachedGeneration[];
    currentGenerationId: string | null;

    // Preview state for generation
    previewType: PreviewType;
    atsSettings: ResumeFormatSettings;
    humanSettings: ResumeFormatSettings;

    // UI state
    isEditingGeneration: boolean;
  } => ({
    vacancies: [],
    currentVacancy: null,
    loading: false,
    error: null,

    // Generation state
    generations: [],
    latestGeneration: null,
    generationLoading: false,
    generating: false,
    savingGeneration: false,

    // Cached generations for editing
    cachedGenerations: [],
    currentGenerationId: null,

    // Preview state
    previewType: 'ats',
    atsSettings: { ...DEFAULT_FORMAT_SETTINGS },
    humanSettings: { ...DEFAULT_FORMAT_SETTINGS },

    // UI state
    isEditingGeneration: false
  }),

  getters: {
    /**
     * Check if user has any vacancies
     */
    hasVacancies: (state): boolean => state.vacancies.length > 0,

    /**
     * Get the latest (most recent) vacancy
     */
    latestVacancy: (state): Vacancy | null => {
      if (state.vacancies.length === 0) return null;
      const sorted = [...state.vacancies].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return sorted[0] ?? null;
    },

    // =========================================
    // Generation Getters
    // =========================================

    /**
     * Get current generation from cache
     */
    currentGeneration: (state): Generation | null => {
      if (!state.currentGenerationId) return null;
      const cached = state.cachedGenerations.find(c => c.id === state.currentGenerationId);
      return cached?.generation ?? null;
    },

    /**
     * Check if generation has content to display
     */
    hasGeneration(): boolean {
      return this.currentGeneration !== null;
    },

    /**
     * Get content for display from current generation
     */
    displayGenerationContent(): ResumeContent | null {
      return this.currentGeneration?.content ?? null;
    },

    /**
     * Get current format settings based on preview type
     */
    currentSettings: (state): ResumeFormatSettings => {
      return state.previewType === 'ats' ? state.atsSettings : state.humanSettings;
    }
  },

  actions: {
    /**
     * Fetch all vacancies for current user
     * Returns data for useAsyncData compatibility
     */
    async fetchVacancies(): Promise<Vacancy[]> {
      this.loading = true;
      this.error = null;

      try {
        const data = await vacancyApi.fetchAll();
        this.vacancies = data;
        return data;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch vacancies');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch a single vacancy by ID
     * Returns data for useAsyncData compatibility
     */
    async fetchVacancy(id: string): Promise<Vacancy | null> {
      this.loading = true;
      this.error = null;

      try {
        const vacancy = await vacancyApi.fetchById(id);
        this.currentVacancy = vacancy;
        return vacancy;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch vacancy');
        this.currentVacancy = null;
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new vacancy
     * Returns the created vacancy
     */
    async createVacancy(data: VacancyInput): Promise<Vacancy> {
      this.loading = true;
      this.error = null;

      try {
        const vacancy = await vacancyApi.create(data);

        // Add to list at the beginning (most recent)
        this.vacancies.unshift(vacancy);
        this.currentVacancy = vacancy;

        return vacancy;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to create vacancy');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update a vacancy
     * Returns the updated vacancy
     */
    async updateVacancy(id: string, data: Partial<VacancyInput>): Promise<Vacancy> {
      this.loading = true;
      this.error = null;

      try {
        const vacancy = await vacancyApi.update(id, data);

        // Update in list
        const index = this.vacancies.findIndex(v => v.id === id);
        if (index !== -1) {
          this.vacancies[index] = vacancy;
        }

        // Update current if it's the same vacancy
        if (this.currentVacancy?.id === id) {
          this.currentVacancy = vacancy;
        }

        return vacancy;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update vacancy');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update status of the current vacancy
     */
    async updateVacancyStatus(status: VacancyStatus): Promise<void> {
      if (!this.currentVacancy) return;
      await this.updateVacancy(this.currentVacancy.id, { status });
    },

    /**
     * Delete a vacancy
     */
    async deleteVacancy(id: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await vacancyApi.delete(id);

        // Remove from list
        this.vacancies = this.vacancies.filter(v => v.id !== id);

        // Clear current if it's the deleted vacancy
        if (this.currentVacancy?.id === id) {
          this.currentVacancy = null;
        }
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to delete vacancy');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    // =========================================
    // Generation API Actions
    // =========================================

    /**
     * Generate a tailored resume for a vacancy
     * Returns the generated data for useAsyncData compatibility
     */
    async generateResume(vacancyId: string, options?: GenerateOptions): Promise<Generation> {
      this.generating = true;
      this.error = null;

      try {
        const generation = await generationApi.generate(vacancyId, options);
        this.latestGeneration = generation;
        this.generations.unshift(generation);

        // Add to cache
        this._addToCache(generation);

        return generation;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to generate resume');
        throw this.error;
      } finally {
        this.generating = false;
      }
    },

    /**
     * Fetch all generations for a vacancy
     * Returns data for useAsyncData compatibility
     */
    async fetchGenerations(vacancyId: string): Promise<Generation[]> {
      this.generationLoading = true;
      this.error = null;

      try {
        const data = await generationApi.fetchAll(vacancyId);
        this.generations = data;
        return data;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch generations');
        throw this.error;
      } finally {
        this.generationLoading = false;
      }
    },

    /**
     * Fetch the latest generation for a vacancy
     * Returns data for useAsyncData compatibility
     */
    async fetchLatestGeneration(vacancyId: string): Promise<VacanciesResumeGeneration> {
      this.generationLoading = true;
      this.error = null;

      try {
        const payload = await generationApi.fetchLatest(vacancyId);
        this.latestGeneration = payload.generation;

        // Add to cache if exists
        if (payload.generation) {
          this._addToCache(payload.generation);
        }

        return payload;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch latest generation');
        throw this.error;
      } finally {
        this.generationLoading = false;
      }
    },

    /**
     * Persist generation content to server
     * Returns updated generation for useAsyncData compatibility
     */
    async persistGenerationContent(
      vacancyId: string,
      generationId: string,
      content: ResumeContent
    ): Promise<Generation> {
      this.savingGeneration = true;
      this.error = null;

      try {
        const updated = await generationApi.updateContent(vacancyId, generationId, content);

        // Update in list
        const index = this.generations.findIndex(g => g.id === generationId);
        if (index !== -1) {
          this.generations[index] = updated;
        }

        // Update latest if it's the same generation
        if (this.latestGeneration?.id === generationId) {
          this.latestGeneration = updated;
        }

        // Update in cache
        this._updateInCache(updated);

        return updated;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update generation');
        throw this.error;
      } finally {
        this.savingGeneration = false;
      }
    },

    // =========================================
    // Generation Cache Actions
    // =========================================

    /**
     * Set current generation for editing (adds to cache if needed)
     */
    setCurrentGeneration(generation: Generation | null): void {
      if (generation) {
        this._addToCache(generation);
        this.currentGenerationId = generation.id;
      } else {
        this.currentGenerationId = null;
      }
    },

    /**
     * Update content of a generation in cache
     */
    updateGenerationContent(content: ResumeContent): void {
      if (!this.currentGenerationId) return;

      const cached = this.cachedGenerations.find(c => c.id === this.currentGenerationId);
      if (cached) {
        cached.generation = {
          ...cached.generation,
          content
        };
      }
    },

    /**
     * Update a specific field in generation content
     */
    updateGenerationField<K extends keyof ResumeContent>(field: K, value: ResumeContent[K]): void {
      if (!this.currentGenerationId) return;

      const cached = this.cachedGenerations.find(c => c.id === this.currentGenerationId);
      if (cached?.generation.content) {
        cached.generation = {
          ...cached.generation,
          content: {
            ...cached.generation.content,
            [field]: value
          }
        };
      }
    },

    /**
     * Save current generation content to server
     */
    async saveGenerationContent(vacancyId: string): Promise<Generation | null> {
      const generation = this.currentGeneration;
      if (!generation) return null;

      return this.persistGenerationContent(vacancyId, generation.id, generation.content);
    },

    /**
     * Discard changes and reload from server
     */
    async discardGenerationChanges(vacancyId: string): Promise<void> {
      if (!this.currentGenerationId) return;

      // Remove from cache
      this.cachedGenerations = this.cachedGenerations.filter(
        c => c.id !== this.currentGenerationId
      );

      // Refetch
      const payload = await this.fetchLatestGeneration(vacancyId);
      if (payload.generation) {
        this.setCurrentGeneration(payload.generation);
      }
    },

    /**
     * Add generation to cache
     */
    _addToCache(generation: Generation): void {
      // Check if already in cache
      const existingIndex = this.cachedGenerations.findIndex(c => c.id === generation.id);

      if (existingIndex !== -1) {
        // Update existing
        this.cachedGenerations[existingIndex] = {
          id: generation.id,
          generation: structuredClone(generation)
        };
      } else {
        // Add new
        this.cachedGenerations.unshift({
          id: generation.id,
          generation: structuredClone(generation)
        });

        // Trim if exceeds max
        if (this.cachedGenerations.length > MAX_CACHED_GENERATIONS) {
          this.cachedGenerations = this.cachedGenerations.slice(0, MAX_CACHED_GENERATIONS);
        }
      }
    },

    /**
     * Update generation in cache
     */
    _updateInCache(generation: Generation): void {
      const index = this.cachedGenerations.findIndex(c => c.id === generation.id);
      if (index !== -1) {
        this.cachedGenerations[index] = {
          id: generation.id,
          generation: structuredClone(generation)
        };
      }
    },

    // =========================================
    // UI State Actions
    // =========================================

    /**
     * Start editing generation content
     */
    startEditingGeneration(): void {
      this.isEditingGeneration = true;
    },

    /**
     * Stop editing generation content
     */
    stopEditingGeneration(): void {
      this.isEditingGeneration = false;
    },

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
     * Reset store state
     */
    $reset() {
      this.vacancies = [];
      this.currentVacancy = null;
      this.loading = false;
      this.error = null;

      // Generation state
      this.generations = [];
      this.latestGeneration = null;
      this.generationLoading = false;
      this.generating = false;
      this.savingGeneration = false;

      // Cached generations
      this.cachedGenerations = [];
      this.currentGenerationId = null;

      // Preview state
      this.previewType = 'ats';
      this.atsSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.humanSettings = { ...DEFAULT_FORMAT_SETTINGS };

      // UI state
      this.isEditingGeneration = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
