import { llmRoutingRepository } from '../../../../data/repositories';

/**
 * GET /api/admin/llm/routing
 *
 * Read scenario routing defaults and role overrides.
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const items = await llmRoutingRepository.getRoutingItems();

  return {
    items
  };
});
