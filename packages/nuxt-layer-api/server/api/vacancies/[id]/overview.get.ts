import type { VacancyOverview } from '@layer/api/types/vacancies';
import { generationRepository, vacancyRepository } from '@layer/api/server/data/repositories';

/**
 * GET /api/vacancies/:id/overview
 *
 * Get all data required by vacancy overview sub-page in a single request.
 *
 * Response: vacancy + latest valid generation summary (or null)
 */
export default defineEventHandler(async (event): Promise<VacancyOverview> => {
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

  const latestGeneration = await generationRepository.findLatestOverviewByVacancyId(id);

  return {
    vacancy,
    latestGeneration,
    canGenerateResume: vacancy.canGenerateResume
  } satisfies VacancyOverview;
});
