import { llmKeyRepository } from '../../data/repositories';
import { getUserId } from '../../utils/session-helpers';

/**
 * GET /api/keys
 *
 * List BYOK key metadata for the current user
 * Returns hint-only metadata (last 4 chars)
 *
 * Related: T125 (US7)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = getUserId(session);

  return await llmKeyRepository.findByUserId(userId);
});
