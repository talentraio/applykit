import type {
  Generation,
  ResumeContent,
  ResumeFormatSettings,
  Vacancy,
  VacancyInput,
  VacancyStatus
} from '@int/schema';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';

/**
 * Vacancy Store
 *
 * Manages vacancy data and operations.
 * Site-specific - uses vacancy.api.ts from vacancy layer.
 *
 * Enhanced with generation editing state for US4 (T043, T044).
 *
 * Related: T097 (US4), T043, T044 (US4)
 */

/**
 * Preview type for generation editing
 */
type PreviewType = 'ats' | 'human';

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

    // Generation editing state (T043)
    currentGeneration: Generation | null;
    editingGenerationContent: ResumeContent | null;
    isGenerationDirty: boolean;
    savingGeneration: boolean;

    // Preview state for generation
    previewType: PreviewType;
    atsSettings: ResumeFormatSettings;
    humanSettings: ResumeFormatSettings;

    // History for undo/redo (T043)
    generationHistory: HistorySnapshot[];
    generationHistoryIndex: number;

    // UI state
    isEditingGeneration: boolean;
  } => ({
    vacancies: [],
    currentVacancy: null,
    loading: false,
    error: null,

    // Generation editing state
    currentGeneration: null,
    editingGenerationContent: null,
    isGenerationDirty: false,
    savingGeneration: false,

    // Preview state
    previewType: 'ats',
    atsSettings: { ...DEFAULT_FORMAT_SETTINGS },
    humanSettings: { ...DEFAULT_FORMAT_SETTINGS },

    // History for undo/redo
    generationHistory: [],
    generationHistoryIndex: -1,

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
    // Generation Editing Getters (T043)
    // =========================================

    /**
     * Check if generation has content to display
     */
    hasGeneration: (state): boolean => state.currentGeneration !== null,

    /**
     * Get content for display (editing or original)
     */
    displayGenerationContent: (state): ResumeContent | null => {
      return state.editingGenerationContent ?? state.currentGeneration?.content ?? null;
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
    canUndoGeneration: (state): boolean => state.generationHistoryIndex > 0,

    /**
     * Check if redo is available
     */
    canRedoGeneration: (state): boolean =>
      state.generationHistoryIndex < state.generationHistory.length - 1,

    /**
     * Get history length for display
     */
    generationHistoryLength: (state): number => state.generationHistory.length
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
    // Generation Editing Actions (T044)
    // =========================================

    /**
     * Set current generation for editing
     */
    setCurrentGeneration(generation: Generation | null): void {
      this.currentGeneration = generation;

      if (generation) {
        this.editingGenerationContent = structuredClone(generation.content);
        this._initializeGenerationHistory(generation.content);
      } else {
        this.editingGenerationContent = null;
        this.generationHistory = [];
        this.generationHistoryIndex = -1;
      }

      this.isGenerationDirty = false;
    },

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
     * Update generation content (local state only)
     */
    updateGenerationContent(content: ResumeContent): void {
      this.editingGenerationContent = content;
      this.isGenerationDirty = true;
      this._pushToGenerationHistory(content);
    },

    /**
     * Update a specific field in generation content
     */
    updateGenerationField<K extends keyof ResumeContent>(field: K, value: ResumeContent[K]): void {
      if (!this.editingGenerationContent) return;

      this.editingGenerationContent = {
        ...this.editingGenerationContent,
        [field]: value
      };
      this.isGenerationDirty = true;
      this._pushToGenerationHistory(this.editingGenerationContent);
    },

    /**
     * Save generation content to server
     * Note: This requires the generation update API endpoint
     */
    async saveGenerationContent(): Promise<void> {
      if (!this.editingGenerationContent || !this.isGenerationDirty || !this.currentGeneration)
        return;

      this.savingGeneration = true;

      try {
        // TODO: Implement generation content update API call
        // For now, update local state
        this.currentGeneration = {
          ...this.currentGeneration,
          content: structuredClone(this.editingGenerationContent)
        };
        this.isGenerationDirty = false;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to save generation');
        throw this.error;
      } finally {
        this.savingGeneration = false;
      }
    },

    /**
     * Undo generation content change
     */
    undoGeneration(): void {
      if (this.generationHistoryIndex <= 0) return;

      this.generationHistoryIndex--;
      const snapshot = this.generationHistory[this.generationHistoryIndex];
      if (snapshot) {
        this.editingGenerationContent = structuredClone(snapshot.content);
        this.isGenerationDirty = true;
      }
    },

    /**
     * Redo generation content change
     */
    redoGeneration(): void {
      if (this.generationHistoryIndex >= this.generationHistory.length - 1) return;

      this.generationHistoryIndex++;
      const snapshot = this.generationHistory[this.generationHistoryIndex];
      if (snapshot) {
        this.editingGenerationContent = structuredClone(snapshot.content);
        this.isGenerationDirty = true;
      }
    },

    /**
     * Discard generation editing changes
     */
    discardGenerationChanges(): void {
      if (!this.currentGeneration) return;

      this.editingGenerationContent = structuredClone(this.currentGeneration.content);
      this._initializeGenerationHistory(this.currentGeneration.content);
      this.isGenerationDirty = false;
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
     * Initialize generation history with initial content
     */
    _initializeGenerationHistory(content: ResumeContent): void {
      this.generationHistory = [{ content: structuredClone(content), timestamp: Date.now() }];
      this.generationHistoryIndex = 0;
    },

    /**
     * Push new snapshot to generation history
     */
    _pushToGenerationHistory(content: ResumeContent): void {
      // Remove any future states if we're not at the end
      if (this.generationHistoryIndex < this.generationHistory.length - 1) {
        this.generationHistory = this.generationHistory.slice(0, this.generationHistoryIndex + 1);
      }

      // Add new snapshot
      this.generationHistory.push({
        content: structuredClone(content),
        timestamp: Date.now()
      });
      this.generationHistoryIndex = this.generationHistory.length - 1;

      // Trim history if too large
      if (this.generationHistory.length > MAX_HISTORY_SIZE) {
        const trimCount = this.generationHistory.length - MAX_HISTORY_SIZE;
        this.generationHistory = this.generationHistory.slice(trimCount);
        this.generationHistoryIndex = Math.max(0, this.generationHistoryIndex - trimCount);
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

      // Generation editing state
      this.currentGeneration = null;
      this.editingGenerationContent = null;
      this.isGenerationDirty = false;
      this.savingGeneration = false;

      // Preview state
      this.previewType = 'ats';
      this.atsSettings = { ...DEFAULT_FORMAT_SETTINGS };
      this.humanSettings = { ...DEFAULT_FORMAT_SETTINGS };

      // History
      this.generationHistory = [];
      this.generationHistoryIndex = -1;

      // UI state
      this.isEditingGeneration = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
