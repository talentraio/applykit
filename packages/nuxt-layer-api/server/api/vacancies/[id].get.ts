import { vacancyRepository } from '../../data/repositories';

/**
 * GET /api/vacancies/:id
 *
 * Get a specific vacancy by ID
 * Only returns the vacancy if it belongs to the current user
 *
 * Response: Vacancy object or 404
 *
 * Related: T094 (US4)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Get vacancy ID from route params
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  // Find vacancy (with ownership check)
  const vacancy = await vacancyRepository.findByIdAndUserId(id, userId);

  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  return vacancy;
});
