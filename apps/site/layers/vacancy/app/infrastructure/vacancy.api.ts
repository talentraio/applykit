import type {
  Vacancy,
  VacancyInput,
  VacancyListColumnVisibility,
  VacancyListQuery,
  VacancyListResponse
} from '@int/schema';

const vacancyUrl = '/api/vacancies';

/**
 * Vacancy API
 *
 * Handles vacancy CRUD and list operations.
 * Site-specific - only used by site app.
 * Used by vacancy store actions.
 */
export const vacancyApi = {
  /**
   * Fetch paginated vacancies with sorting, filtering, and search
   */
  async fetchPaginated(query: VacancyListQuery): Promise<VacancyListResponse> {
    return await useApi(vacancyUrl, {
      method: 'GET',
      query
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
  },

  /**
   * Bulk delete vacancies by IDs
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await useApi(`${vacancyUrl}/bulk`, {
      method: 'DELETE',
      body: { ids }
    });
  },

  /**
   * Update column visibility preferences
   */
  async updateColumnVisibility(
    columnVisibility: VacancyListColumnVisibility
  ): Promise<{ columnVisibility: VacancyListColumnVisibility }> {
    return await useApi('/api/user/preferences/vacancy-list', {
      method: 'PATCH',
      body: { columnVisibility }
    });
  }
};
