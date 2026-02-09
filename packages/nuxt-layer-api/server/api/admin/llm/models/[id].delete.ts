import { z } from 'zod';
import { llmModelRepository } from '../../../../data/repositories';

const IdParamSchema = z.string().uuid();

/**
 * DELETE /api/admin/llm/models/:id
 *
 * Remove model catalog entry if not used by routing.
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const idParam = getRouterParam(event, 'id');
  const idValidation = IdParamSchema.safeParse(idParam);

  if (!idValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid model id'
    });
  }

  const result = await llmModelRepository.delete(idValidation.data);

  if (result === 'not_found') {
    throw createError({
      statusCode: 404,
      message: 'Model not found'
    });
  }

  if (result === 'referenced') {
    throw createError({
      statusCode: 409,
      message: 'Model is currently used in routing configuration'
    });
  }

  setResponseStatus(event, 204);
  return null;
});
