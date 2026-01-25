import type { Vacancy, VacancyInput } from '@int/schema';
import { vacancyApi } from '@site/vacancy/app/infrastructure/vacancy.api';

/**
 * Vacancy Store
 *
 * Manages vacancy data and operations.
 * Site-specific - uses vacancy.api.ts from vacancy layer.
 *
 * Related: T097 (US4)
 */
export const useVacancyStore = defineStore('VacancyStore', {
  state: (): {
    vacancies: Vacancy[];
    currentVacancy: Vacancy | null;
    loading: boolean;
    error: Error | null;
  } => ({
    vacancies: [],
    currentVacancy: null,
    loading: false,
    error: null
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

    /**
     * Reset store state
     */
    $reset() {
      this.vacancies = [];
      this.currentVacancy = null;
      this.loading = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useVacancyStore, import.meta.hot));
}
