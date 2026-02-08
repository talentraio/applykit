import { VacancyListQuerySchema } from '@int/schema';
import { vacancyListPreferencesRepository, vacancyRepository } from '../../data/repositories';

/**
 * GET /api/vacancies
 *
 * List vacancies for the current user with server-side pagination,
 * sorting, filtering, and search.
 *
 * Query params: currentPage, pageSize, sortBy, sortOrder, status[], search
 * Response: { items, pagination: { totalItems, totalPages }, columnVisibility }
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Parse and validate query params
  const query = await getValidatedQuery(event, VacancyListQuerySchema.parse);

  // Fetch paginated vacancies
  const { items, totalItems } = await vacancyRepository.findPaginated(userId, {
    currentPage: query.currentPage,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    status: query.status,
    search: query.search
  });

  const totalPages = Math.ceil(totalItems / query.pageSize);

  // Fetch column visibility preferences (default all visible if none)
  const preferences = await vacancyListPreferencesRepository.findByUserId(userId);
  const columnVisibility = preferences?.columnVisibility ?? {
    company: true,
    status: true,
    updatedAt: true,
    createdAt: true
  };

  return {
    items,
    pagination: {
      totalItems,
      totalPages
    },
    columnVisibility
  };
});
