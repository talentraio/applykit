import type { Generation, ResumeContent, Vacancy, VacancyInput, VacancyStatus } from '@int/schema';
import type { VacanciesResumeGeneration } from '@layer/api/types/vacancies';
import type { GenerateOptions } from '@site/vacancy/app/infrastructure/generation.api';
import { generationApi } from '@site/vacancy/app/infrastructure/generation.api';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';

/**
 * Vacancy Store
 *
 * Manages vacancy data and operations.
 * Format settings are managed by useFormatSettingsStore in _base layer.
 * Undo/redo history is managed by useResumeEditHistory composable.
 */

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

export const useVacancyStore = defineStore('VacancyStore', {
  state: (): {
    vacancies: Vacancy[];
    currentVacancy: Vacancy | null;
    loading: boolean;

    // Generation state
    generations: Generation[];
    latestGeneration: Generation | null;
    generating: boolean;
    savingGeneration: boolean;

    // Cached generations for editing (max 20)
    cachedGenerations: CachedGeneration[];
    currentGenerationId: string | null;

    // UI state
    isEditingGeneration: boolean;
  } => ({
    vacancies: [],
    currentVacancy: null,
    loading: false,

    // Generation state
    generations: [],
    latestGeneration: null,
    generating: false,
    savingGeneration: false,

    // Cached generations for editing
    cachedGenerations: [],
    currentGenerationId: null,

    // UI state
    isEditingGeneration: false
  }),

  getters: {
    /**
     * Check if user has any vacancies
     */
    getHasVacancies: (state): boolean => state.vacancies.length > 0,

    /**
     * Get the latest (most recent) vacancy
     */
    getLatestVacancy: (state): Vacancy | null => {
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
    getCurrentGeneration: (state): Generation | null => {
      if (!state.currentGenerationId) return null;
      const cached = state.cachedGenerations.find(c => c.id === state.currentGenerationId);
      return cached?.generation ?? null;
    },

    /**
     * Check if generation has content to display
     */
    getHasGeneration(): boolean {
      return this.getCurrentGeneration !== null;
    },

    /**
     * Get generation saving state
     */
    getSavingGeneration: (state): boolean => state.savingGeneration,

    /**
     * Get content for display from current generation
     */
    getDisplayGenerationContent(): ResumeContent | null {
      return this.getCurrentGeneration?.content ?? null;
    }
  },

  actions: {
    /**
     * Fetch all vacancies for current user
     */
    async fetchVacancies(): Promise<Vacancy[]> {
      this.loading = true;

      try {
        const data = await vacancyApi.fetchAll();
        this.vacancies = data;
        return data;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch vacancies');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch a single vacancy by ID
     */
    async fetchVacancy(id: string): Promise<Vacancy | null> {
      this.loading = true;

      try {
        const vacancy = await vacancyApi.fetchById(id);
        this.currentVacancy = vacancy;
        return vacancy;
      } catch (err) {
        this.currentVacancy = null;
        throw err instanceof Error ? err : new Error('Failed to fetch vacancy');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Create a new vacancy
     */
    async createVacancy(data: VacancyInput): Promise<Vacancy> {
      this.loading = true;

      try {
        const vacancy = await vacancyApi.create(data);
        this.vacancies.unshift(vacancy);
        this.currentVacancy = vacancy;
        return vacancy;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create vacancy');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update a vacancy
     */
    async updateVacancy(id: string, data: Partial<VacancyInput>): Promise<Vacancy> {
      this.loading = true;

      try {
        const vacancy = await vacancyApi.update(id, data);

        const index = this.vacancies.findIndex(v => v.id === id);
        if (index !== -1) {
          this.vacancies[index] = vacancy;
        }

        if (this.currentVacancy?.id === id) {
          this.currentVacancy = vacancy;
        }

        return vacancy;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update vacancy');
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

      try {
        await vacancyApi.delete(id);
        this.vacancies = this.vacancies.filter(v => v.id !== id);

        if (this.currentVacancy?.id === id) {
          this.currentVacancy = null;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete vacancy');
      } finally {
        this.loading = false;
      }
    },

    // =========================================
    // Generation API Actions
    // =========================================

    /**
     * Generate a tailored resume for a vacancy
     */
    async generateResume(vacancyId: string, options?: GenerateOptions): Promise<Generation> {
      this.generating = true;

      try {
        const generation = await generationApi.generate(vacancyId, options);
        this.latestGeneration = generation;
        this.generations.unshift(generation);
        this._addToCache(generation);
        return generation;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to generate resume');
      } finally {
        this.generating = false;
      }
    },

    /**
     * Fetch all generations for a vacancy
     */
    async fetchGenerations(vacancyId: string): Promise<Generation[]> {
      try {
        const data = await generationApi.fetchAll(vacancyId);
        this.generations = data;
        return data;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch generations');
      }
    },

    /**
     * Fetch the latest generation for a vacancy
     */
    async fetchLatestGeneration(vacancyId: string): Promise<VacanciesResumeGeneration> {
      try {
        const payload = await generationApi.fetchLatest(vacancyId);
        this.latestGeneration = payload.generation;

        if (payload.generation) {
          this._addToCache(payload.generation);
        }

        return payload;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to fetch latest generation');
      }
    },

    /**
     * Persist generation content to server
     */
    async persistGenerationContent(
      vacancyId: string,
      generationId: string,
      content: ResumeContent
    ): Promise<Generation> {
      this.savingGeneration = true;

      try {
        const updated = await generationApi.updateContent(vacancyId, generationId, content);

        const index = this.generations.findIndex(g => g.id === generationId);
        if (index !== -1) {
          this.generations[index] = updated;
        }

        if (this.latestGeneration?.id === generationId) {
          this.latestGeneration = updated;
        }

        this._updateInCache(updated);
        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update generation');
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
      const generation = this.getCurrentGeneration;
      if (!generation) return null;

      return this.persistGenerationContent(vacancyId, generation.id, generation.content);
    },

    /**
     * Discard changes and reload from server
     */
    async discardGenerationChanges(vacancyId: string): Promise<void> {
      if (!this.currentGenerationId) return;

      this.cachedGenerations = this.cachedGenerations.filter(
        c => c.id !== this.currentGenerationId
      );

      const payload = await this.fetchLatestGeneration(vacancyId);
      if (payload.generation) {
        this.setCurrentGeneration(payload.generation);
      }
    },

    /**
     * Add generation to cache
     */
    _addToCache(generation: Generation): void {
      const existingIndex = this.cachedGenerations.findIndex(c => c.id === generation.id);

      if (existingIndex !== -1) {
        this.cachedGenerations[existingIndex] = {
          id: generation.id,
          generation: structuredClone(generation)
        };
      } else {
        this.cachedGenerations.unshift({
          id: generation.id,
          generation: structuredClone(generation)
        });

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
     * Reset store state
     */
    $reset() {
      this.vacancies = [];
      this.currentVacancy = null;
      this.loading = false;

      this.generations = [];
      this.latestGeneration = null;
      this.generating = false;
      this.savingGeneration = false;

      this.cachedGenerations = [];
      this.currentGenerationId = null;

      this.isEditingGeneration = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
