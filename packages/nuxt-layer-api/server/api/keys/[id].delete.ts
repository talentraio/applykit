import { llmKeyRepository } from '../../data/repositories';
import { getUserId } from '../../utils/session-helpers';

/**
 * DELETE /api/keys/:id
 *
 * Delete BYOK key metadata
 *
 * Related: T127 (US7)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = getUserId(session);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Key ID is required'
    });
  }

  const key = await llmKeyRepository.findById(id);
  if (!key || key.userId !== userId) {
    throw createError({
      statusCode: 404,
      message: 'Key not found'
    });
  }

  await llmKeyRepository.delete(id, userId);

  return {
    success: true
  };
});
