import { VacancyListPreferencesPatchSchema } from '@int/schema';
import { vacancyListPreferencesRepository } from '../../../data/repositories';

/**
 * PATCH /api/user/preferences/vacancy-list
 *
 * Update vacancy list column visibility preferences.
 * Creates the preference row if it doesn't exist (upsert).
 *
 * Body: { columnVisibility: Record<string, boolean> }
 * Response: { columnVisibility }
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const body = await readValidatedBody(event, VacancyListPreferencesPatchSchema.parse);

  const updated = await vacancyListPreferencesRepository.upsert(userId, {
    columnVisibility: body.columnVisibility
  });

  return {
    columnVisibility: updated.columnVisibility
  };
});
