import type { VacancyCoverLetterResponse } from '@layer/api/types/vacancies';
import { coverLetterRepository, vacancyRepository } from '../../../data/repositories';

/**
 * GET /api/vacancies/:id/cover-letter
 *
 * Returns the latest stored cover letter for vacancy.
 */
export default defineEventHandler(async (event): Promise<VacancyCoverLetterResponse> => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  const vacancy = await vacancyRepository.findByIdAndUserId(vacancyId, userId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  const coverLetter = await coverLetterRepository.findLatestByVacancyId(vacancyId);

  return {
    coverLetter
  };
});
