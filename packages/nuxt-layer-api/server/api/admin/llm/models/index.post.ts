import { LlmModelCreateInputSchema } from '@int/schema';
import { llmModelRepository } from '../../../../data/repositories';

/**
 * POST /api/admin/llm/models
 *
 * Create model catalog entry.
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const body = await readBody(event);
  const validation = LlmModelCreateInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const input = validation.data;
  const exists = await llmModelRepository.hasProviderModelKey(input.provider, input.modelKey);
  if (exists) {
    throw createError({
      statusCode: 409,
      message: 'Model with this provider and key already exists'
    });
  }

  const created = await llmModelRepository.create(input);
  setResponseStatus(event, 201);

  return created;
});
