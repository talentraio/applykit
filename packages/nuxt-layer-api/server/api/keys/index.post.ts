import { LLMKeyInputSchema } from '@int/schema';
import { llmKeyRepository } from '../../data/repositories';
import { getUserId } from '../../utils/session-helpers';

/**
 * POST /api/keys
 *
 * Store BYOK key metadata (hint only)
 * Request body: { provider, keyHint }
 *
 * Related: T126 (US7)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = getUserId(session);

  const body = await readBody(event);
  const validationResult = LLMKeyInputSchema.safeParse(body);

  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid key metadata',
      data: validationResult.error.format()
    });
  }

  const { provider, keyHint } = validationResult.data;

  return await llmKeyRepository.upsert(userId, provider, keyHint);
});
