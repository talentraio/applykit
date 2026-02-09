import type { VacancyMeta } from '@layer/api/types/vacancies';
import { vacancyRepository } from '../../../data/repositories';

/**
 * GET /api/vacancies/:id/meta
 *
 * Get vacancy meta by ID.
 * Only returns the vacancy if it belongs to the current user.
 *
 * Response: VacancyMeta object or 404
 */
export default defineEventHandler(async (event): Promise<VacancyMeta> => {
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

  // Find vacancy meta (with ownership check)
  const vacancyMeta = await vacancyRepository.findMetaByIdAndUserId(id, userId);

  if (!vacancyMeta) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  return vacancyMeta;
});
