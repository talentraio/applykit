import { vacancyRepository } from '../../data/repositories';

/**
 * GET /api/vacancies
 *
 * List all vacancies for the current user
 * Ordered by most recent first
 *
 * Related: T092 (US4)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);

  // Get vacancies for user
  const vacancies = await vacancyRepository.findByUserId((session.user as { id: string }).id);

  return vacancies;
});
