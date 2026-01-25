import { generationRepository, vacancyRepository } from '../../../../data/repositories';

/**
 * GET /api/vacancies/:id/generations
 *
 * List all generations for a vacancy
 * Ordered by most recent first
 *
 * Response: Array of Generation objects
 *
 * Related: T107 (US5)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Get vacancy ID from route params
  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  // Verify vacancy belongs to user
  const vacancy = await vacancyRepository.findById(vacancyId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  if (vacancy.userId !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    });
  }

  // Get all generations for this vacancy
  const generations = await generationRepository.findByVacancyId(vacancyId);

  return generations;
});
