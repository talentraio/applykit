import type { VacancyStatus } from '@int/schema';
import { VACANCY_STATUS_VALUES } from '@int/schema';

/**
 * Returns the list of statuses a user is allowed to transition TO,
 * given the current status and whether a generation exists.
 *
 * Rules (mirrors server-side guard in PUT /api/vacancies/:id):
 *   - 'created'   is only reachable when no generation exists
 *   - 'generated' is only reachable when a generation exists
 *   - the current status is excluded (no-op transition)
 */
export const getAvailableStatuses = (
  currentStatus: VacancyStatus,
  hasGeneration: boolean
): VacancyStatus[] =>
  VACANCY_STATUS_VALUES.filter((status): status is VacancyStatus => {
    if (status === currentStatus) return false;
    if (hasGeneration && status === 'created') return false;
    if (!hasGeneration && status === 'generated') return false;
    return true;
  });
