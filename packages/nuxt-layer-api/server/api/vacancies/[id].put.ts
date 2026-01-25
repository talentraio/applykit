import { VacancyInputSchema } from '@int/schema';
import { vacancyRepository } from '../../data/repositories';

/**
 * PUT /api/vacancies/:id
 *
 * Update a vacancy
 * Only updates if the vacancy belongs to the current user
 *
 * Request body: Partial<VacancyInput>
 *
 * Response: Updated Vacancy object or 404
 *
 * Related: T095 (US4)
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

  // Read and validate request body
  const body = await readBody(event);

  // Allow partial updates
  const validationResult = VacancyInputSchema.partial().safeParse(body);
  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid vacancy data',
      data: validationResult.error.format()
    });
  }

  // Update vacancy (with ownership check)
  const vacancy = await vacancyRepository.update(id, userId, validationResult.data);

  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  return vacancy;
});
