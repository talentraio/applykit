import { VACANCY_STATUS_MAP, VacancyInputSchema } from '@int/schema';
import { generationRepository, vacancyRepository } from '../../data/repositories';

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

  // Validate status transition rules
  if (validationResult.data.status !== undefined) {
    const generationCount = await generationRepository.countByVacancyId(id);
    const hasGeneration = generationCount > 0;

    if (hasGeneration && validationResult.data.status === VACANCY_STATUS_MAP.CREATED) {
      throw createError({
        statusCode: 400,
        message: 'Cannot revert status to "created" when generations exist'
      });
    }

    if (!hasGeneration && validationResult.data.status === VACANCY_STATUS_MAP.GENERATED) {
      throw createError({
        statusCode: 400,
        message: 'Cannot set status to "generated" without a generation'
      });
    }
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
