import type { VacancyInput } from '@int/schema';
import type { Vacancy } from '../../data/schema';
import { VACANCY_STATUS_MAP, VacancyInputSchema } from '@int/schema';
import { generationRepository, vacancyRepository } from '../../data/repositories';

const hasGenerationUnlockingChange = (
  currentVacancy: Vacancy,
  payload: Partial<VacancyInput>
): boolean => {
  const hasCompanyChanged =
    payload.company !== undefined && payload.company !== currentVacancy.company;
  const hasJobPositionChanged =
    payload.jobPosition !== undefined &&
    (payload.jobPosition ?? null) !== (currentVacancy.jobPosition ?? null);
  const hasDescriptionChanged =
    payload.description !== undefined && payload.description !== currentVacancy.description;

  return hasCompanyChanged || hasJobPositionChanged || hasDescriptionChanged;
};

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

  // Check if vacancy exists and belongs to current user
  const currentVacancy = await vacancyRepository.findByIdAndUserId(id, userId);
  if (!currentVacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  // Read and validate request body
  const body = await readBody(event);

  // Allow partial updates
  const validationResult = VacancyInputSchema.partial().safeParse(body);
  if (!validationResult.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      message: 'Invalid vacancy data',
      data: { issues: validationResult.error.issues }
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

  const shouldUnlockGeneration = hasGenerationUnlockingChange(
    currentVacancy,
    validationResult.data
  );

  // Update vacancy (with ownership check)
  const vacancy = await vacancyRepository.update(id, userId, {
    ...validationResult.data,
    ...(shouldUnlockGeneration ? { canGenerateResume: true } : {})
  });

  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  return vacancy;
});
