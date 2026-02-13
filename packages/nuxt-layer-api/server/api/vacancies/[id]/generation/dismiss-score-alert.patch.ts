import { generationRepository, vacancyRepository } from '../../../../data/repositories';

/**
 * PATCH /api/vacancies/[id]/generation/dismiss-score-alert
 *
 * Dismiss the score notification alert for the latest generation.
 * The alert will be shown again after the next resume regeneration.
 *
 * Request:
 * - Content-Type: application/json
 * - Body: { generationId?: string } (optional, uses latest if not provided)
 *
 * Response:
 * - 200: { success: true }
 * - 404: Vacancy or generation not found
 * - 403: Access denied
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

  // Parse request body (optional generationId)
  const body = await readBody<{ generationId?: string }>(event).catch(
    (): { generationId?: string } => ({})
  );

  // Get generation (use provided ID or find latest)
  let generation;
  if (body.generationId) {
    generation = await generationRepository.findById(body.generationId);
  } else {
    generation = await generationRepository.findLatestByVacancyId(vacancyId);
  }

  if (!generation) {
    throw createError({
      statusCode: 404,
      message: 'Generation not found'
    });
  }

  // Dismiss the alert
  await generationRepository.dismissScoreAlert(generation.id);

  return { success: true };
});
