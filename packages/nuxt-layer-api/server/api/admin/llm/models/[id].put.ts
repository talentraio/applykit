import { LlmModelUpdateInputSchema } from '@int/schema';
import { z } from 'zod';
import { llmModelRepository } from '../../../../data/repositories';

const IdParamSchema = z.string().uuid();

/**
 * PUT /api/admin/llm/models/:id
 *
 * Update model catalog entry.
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

  const body = await readBody(event);
  const validation = LlmModelUpdateInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  if (Object.keys(validation.data).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No fields provided for update'
    });
  }

  const updated = await llmModelRepository.update(idValidation.data, validation.data);
  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Model not found'
    });
  }

  return updated;
});
