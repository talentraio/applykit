import type { Vacancy, VacancyInput } from '@int/schema';

const vacancyUrl = '/api/vacancies';

/**
 * Vacancy API
 *
 * Handles vacancy CRUD operations.
 * Site-specific - only used by site app.
 * Used by vacancy store actions.
 *
 * Related: T097 (US4)
 */
export const vacancyApi = {
  /**
   * Fetch all vacancies for current user
   */
  async fetchAll(): Promise<Vacancy[]> {
    return await useApi(vacancyUrl, {
      method: 'GET'
    });
  },

  /**
   * Fetch a single vacancy by ID
   */
  async fetchById(id: string): Promise<Vacancy> {
    return await useApi(`${vacancyUrl}/${id}`, {
      method: 'GET'
    });
  },

  /**
   * Create a new vacancy
   */
  async create(data: VacancyInput): Promise<Vacancy> {
    return await useApi(vacancyUrl, {
      method: 'POST',
      body: data
    });
  },

  /**
   * Update a vacancy
   */
  async update(id: string, data: Partial<VacancyInput>): Promise<Vacancy> {
    return await useApi(`${vacancyUrl}/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Delete a vacancy
   */
  async delete(id: string): Promise<void> {
    await useApi(`${vacancyUrl}/${id}`, {
      method: 'DELETE'
    });
  }
};
