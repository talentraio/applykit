import { llmModelRepository } from '../../../../data/repositories';

/**
 * GET /api/admin/llm/models
 *
 * List model catalog entries.
 */
export default defineEventHandler(async event => {
  await requireSuperAdmin(event);

  const items = await llmModelRepository.findAll();

  return {
    items
  };
});
