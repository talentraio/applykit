import type {
  Generation,
  ResumeContent,
  Vacancy,
  VacancyInput,
  VacancyListColumnVisibility,
  VacancyListQuery,
  VacancyListResponse,
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
    vacancyListResponse: VacancyListResponse | null;
    currentVacancy: Vacancy | null;
    loading: boolean;

    // Generation state
    generations: Generation[];
    latestGeneration: Generation | null;
    generating: boolean;
    savingGeneration: boolean;
    generationSaveEpoch: number;

    // Cached generations for editing (max 20)
    cachedGenerations: CachedGeneration[];
    currentGenerationId: string | null;

    // UI state
    isEditingGeneration: boolean;
  } => ({
    vacancyListResponse: null,
    currentVacancy: null,
    loading: false,

    // Generation state
    generations: [],
    latestGeneration: null,
    generating: false,
    savingGeneration: false,
    generationSaveEpoch: 0,

    // Cached generations for editing
    cachedGenerations: [],
    currentGenerationId: null,

    // UI state
    isEditingGeneration: false
  }),

  getters: {
    /**
     * Get vacancies from list response
     */
    vacancies: (state): Vacancy[] => state.vacancyListResponse?.items ?? [],

    /**
     * Get total items count from list response
     */
    totalItems: (state): number => state.vacancyListResponse?.pagination.totalItems ?? 0,

    /**
     * Get total pages count from list response
     */
    totalPages: (state): number => state.vacancyListResponse?.pagination.totalPages ?? 0,

    /**
     * Check if user has any vacancies
     */
    getHasVacancies(): boolean {
      return this.vacancies.length > 0;
    },

    /**
     * Get the latest (most recent) vacancy
     */
    getLatestVacancy(): Vacancy | null {
      if (this.vacancies.length === 0) return null;
      const sorted = [...this.vacancies].sort(
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
     * Fetch paginated vacancies with sorting, filtering, and search
     */
    async fetchVacanciesPaginated(query: VacancyListQuery): Promise<VacancyListResponse> {
      this.loading = true;

      try {
        const data = await vacancyApi.fetchPaginated(query);
        this.vacancyListResponse = data;
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

        if (this.currentVacancy?.id === id) {
          this.currentVacancy = null;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete vacancy');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Bulk delete vacancies by IDs
     */
    async bulkDeleteVacancies(ids: string[]): Promise<void> {
      this.loading = true;

      try {
        await vacancyApi.bulkDelete(ids);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to bulk delete vacancies');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update column visibility preferences
     */
    async updateColumnVisibility(columnVisibility: VacancyListColumnVisibility): Promise<void> {
      try {
        const result = await vacancyApi.updateColumnVisibility(columnVisibility);

        if (this.vacancyListResponse) {
          this.vacancyListResponse.columnVisibility = result.columnVisibility;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update column visibility');
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
    ): Promise<Generation | null> {
      const saveEpoch = this.generationSaveEpoch + 1;
      this.generationSaveEpoch = saveEpoch;
      this.savingGeneration = true;

      try {
        const updated = await generationApi.updateContent(vacancyId, generationId, content);
        if (saveEpoch !== this.generationSaveEpoch) {
          return null;
        }

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
        if (saveEpoch === this.generationSaveEpoch) {
          this.savingGeneration = false;
        }
      }
    },

    /**
     * Invalidate in-flight generation save operations.
     * Used by discard flow so stale autosave responses are ignored.
     */
    invalidateGenerationSaves(): void {
      this.generationSaveEpoch += 1;
      this.savingGeneration = false;
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
      this.vacancyListResponse = null;
      this.currentVacancy = null;
      this.loading = false;

      this.generations = [];
      this.latestGeneration = null;
      this.generating = false;
      this.savingGeneration = false;
      this.generationSaveEpoch = 0;

      this.cachedGenerations = [];
      this.currentGenerationId = null;

      this.isEditingGeneration = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
