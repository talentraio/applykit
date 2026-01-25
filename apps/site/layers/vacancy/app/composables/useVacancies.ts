/**
 * Vacancies Composable
 *
 * Thin proxy over vacancy store for convenient access in components.
 * Does NOT hold state - all state lives in useVacancyStore.
 *
 * Related: T097 (US4)
 */

import type { Vacancy, VacancyInput } from '@int/schema';

export type UseVacanciesReturn = {
  /**
   * List of vacancies (from store)
   */
  vacancies: ComputedRef<Vacancy[]>;

  /**
   * Currently selected vacancy (from store)
   */
  current: ComputedRef<Vacancy | null>;

  /**
   * Loading state (from store)
   */
  loading: ComputedRef<boolean>;

  /**
   * Error state (from store)
   */
  error: ComputedRef<Error | null>;

  /**
   * Check if user has any vacancies
   */
  hasVacancies: ComputedRef<boolean>;

  /**
   * Fetch all vacancies
   */
  fetchVacancies: () => Promise<Vacancy[]>;

  /**
   * Fetch a single vacancy by ID
   */
  fetchVacancy: (id: string) => Promise<Vacancy | null>;

  /**
   * Create a new vacancy
   */
  createVacancy: (data: VacancyInput) => Promise<Vacancy>;

  /**
   * Update a vacancy
   */
  updateVacancy: (id: string, data: Partial<VacancyInput>) => Promise<Vacancy>;

  /**
   * Delete a vacancy
   */
  deleteVacancy: (id: string) => Promise<void>;
};

export function useVacancies(): UseVacanciesReturn {
  const store = useVacancyStore();

  return {
    // Computed refs from store state
    vacancies: computed(() => store.vacancies),
    current: computed(() => store.currentVacancy),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasVacancies: computed(() => store.hasVacancies),

    // Proxy to store actions
    fetchVacancies: () => store.fetchVacancies(),
    fetchVacancy: (id: string) => store.fetchVacancy(id),
    createVacancy: (data: VacancyInput) => store.createVacancy(data),
    updateVacancy: (id: string, data: Partial<VacancyInput>) => store.updateVacancy(id, data),
    deleteVacancy: (id: string) => store.deleteVacancy(id)
  };
}
