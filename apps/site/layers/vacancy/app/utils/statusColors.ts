import type { BadgeProps } from '#ui/types';
import type { VacancyStatus } from '@int/schema';

/**
 * NuxtUI colour token for each vacancy status.
 * Update here when the status set changes.
 */
export const STATUS_COLORS: Record<VacancyStatus, NonNullable<BadgeProps['color']>> = {
  created: 'neutral',
  generated: 'primary',
  screening: 'warning',
  rejected: 'error',
  interview: 'success',
  offer: 'secondary'
};

export const getStatusColor = (status: VacancyStatus): BadgeProps['color'] => STATUS_COLORS[status];
