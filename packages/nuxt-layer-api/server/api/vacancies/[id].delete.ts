import { vacancyRepository } from '../../data/repositories';

/**
 * DELETE /api/vacancies/:id
 *
 * Delete a vacancy
 * Only deletes if the vacancy belongs to the current user
 * Associated generations are cascade-deleted
 *
 * Response: 204 No Content or 404
 *
 * Related: T096 (US4)
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

  // Check if vacancy exists and belongs to user
  const vacancy = await vacancyRepository.findByIdAndUserId(id, userId);

  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  // Delete vacancy
  await vacancyRepository.delete(id, userId);

  // Return 204 No Content
  setResponseStatus(event, 204);
  return null;
});
