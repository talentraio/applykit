import type { ResumeContent } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { generationRepository, vacancyRepository } from '../../../data/repositories';

/**
 * PUT /api/vacancies/[id]/generation
 *
 * Update the latest generation content for a vacancy
 * Allows user to edit the generated resume
 *
 * Request:
 * - Content-Type: application/json
 * - Fields:
 *   - content: ResumeContent (updated resume content)
 *   - generationId?: string (optional, if not provided uses latest)
 *
 * Response:
 * - Updated Generation object
 * - 404: Vacancy or generation not found
 * - 400: Validation error
 *
 * Related: T013 (US1)
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

  // Parse request body
  const body = await readBody<{
    content: ResumeContent;
    generationId?: string;
  }>(event);

  // Validate content
  const contentValidation = ResumeContentSchema.safeParse(body.content);
  if (!contentValidation.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid resume content: ${contentValidation.error.message}`
    });
  }

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

  // Update generation content
  const updatedGeneration = await generationRepository.updateContent(
    generation.id,
    contentValidation.data
  );

  if (!updatedGeneration) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update generation'
    });
  }

  return updatedGeneration;
});
