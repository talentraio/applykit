import { VacancyInputSchema } from '@int/schema';
import { vacancyRepository } from '../../data/repositories';

/**
 * POST /api/vacancies
 *
 * Create a new vacancy
 *
 * Request body: VacancyInput
 * - company: string (required)
 * - jobPosition: string | null (optional)
 * - description: string (required)
 * - url: string | null (optional)
 * - notes: string | null (optional)
 *
 * Response: Created Vacancy object
 *
 * Related: T093 (US4)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Read and validate request body
  const body = await readBody(event);

  const validationResult = VacancyInputSchema.safeParse(body);
  if (!validationResult.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      message: 'Invalid vacancy data',
      data: { issues: validationResult.error.issues }
    });
  }

  // Create vacancy
  const vacancy = await vacancyRepository.create(userId, validationResult.data);

  return vacancy;
});
