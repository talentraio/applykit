import { startOfDay, subDays } from 'date-fns';
import { z } from 'zod';
import { usageLogRepository } from '../../../data/repositories';
import { requireSuperAdmin } from '../../../utils/session-helpers';

/**
 * GET /api/admin/usage
 *
 * Get system-wide usage stats
 * Admin-only endpoint
 *
 * Related: T145 (US9)
 */

type UsagePeriod = 'day' | 'week' | 'month';

type AdminUsageStats = {
  period: UsagePeriod;
  totalOperations: number;
  byOperation: {
    parse: number;
    generate: number;
    export: number;
  };
  byProvider: {
    platform: number;
    byok: number;
  };
  totalCost: number;
  uniqueUsers: number;
};

const PeriodSchema = z.enum(['day', 'week', 'month']);

const resolveStartDate = (period: UsagePeriod): Date => {
  const today = startOfDay(new Date());

  if (period === 'week') {
    return subDays(today, 6);
  }

  if (period === 'month') {
    return subDays(today, 29);
  }

  return today;
};

export default defineEventHandler(async (event): Promise<AdminUsageStats> => {
  // Require super_admin role
  await requireSuperAdmin(event);

  const query = getQuery(event);
  const periodValue = typeof query.period === 'string' ? query.period : 'day';
  const periodValidation = PeriodSchema.safeParse(periodValue);

  if (!periodValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid period value'
    });
  }

  const period = periodValidation.data;
  const startDate = resolveStartDate(period);

  const stats = await usageLogRepository.getSystemStats(startDate);

  return {
    period,
    totalOperations: stats.totalOperations,
    byOperation: stats.byOperation,
    byProvider: stats.byProvider,
    totalCost: stats.totalCost,
    uniqueUsers: stats.uniqueUsers
  };
});
