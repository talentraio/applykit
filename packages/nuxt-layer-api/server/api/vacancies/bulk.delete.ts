import { VacancyBulkDeleteSchema } from '@int/schema';
import { vacancyRepository } from '../../data/repositories';

/**
 * DELETE /api/vacancies/bulk
 *
 * Bulk delete vacancies by IDs.
 * Verifies all IDs belong to the current user (403 if any don't).
 * Associated generations are cascade-deleted.
 *
 * Body: { ids: string[] } (1–100 UUIDs)
 * Response: 204 No Content
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const body = await readValidatedBody(event, VacancyBulkDeleteSchema.parse);

  await vacancyRepository.bulkDelete(body.ids, userId);

  setResponseStatus(event, 204);
  return null;
});
