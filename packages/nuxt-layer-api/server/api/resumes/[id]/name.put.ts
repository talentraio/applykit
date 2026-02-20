import { UpdateResumeNameSchema } from '@int/schema';
import { resumeRepository } from '../../../data/repositories';

/**
 * PUT /api/resumes/:id/name
 *
 * Update resume name.
 * Validates 1-255 chars, ownership check.
 *
 * Params: id — resume UUID
 * Body: { name: string }
 * Response 200: { id, name, updatedAt }
 * Errors: 401, 404, 422
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Resume ID is required'
    });
  }

  const body = await readBody(event);
  const parsed = UpdateResumeNameSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: parsed.error.issues }
    });
  }

  const updated = await resumeRepository.updateName(id, userId, parsed.data.name);
  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  return {
    id: updated.id,
    name: updated.name,
    updatedAt: updated.updatedAt.toISOString()
  };
});
