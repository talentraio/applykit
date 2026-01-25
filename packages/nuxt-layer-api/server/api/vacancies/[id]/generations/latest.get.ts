import { generationRepository, vacancyRepository } from '../../../../data/repositories';

/**
 * GET /api/vacancies/:id/generations/latest
 *
 * Get the latest non-expired generation for a vacancy
 *
 * Response: Generation object or null if no valid generation exists
 *
 * Related: T108 (US5)
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

  // Get latest generation (returns null if expired or not found)
  const generation = await generationRepository.findLatestByVacancyId(vacancyId);

  if (!generation) {
    // Return 404 if no valid generation exists
    throw createError({
      statusCode: 404,
      message: 'No valid generation found'
    });
  }

  return generation;
});
