import type { Operation, ProviderType, UsageContext } from '@int/schema';
import type { UsageLog } from '../schema';
import { startOfDay, subDays } from 'date-fns';
import { and, eq, gte, lt, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { usageLogs } from '../schema';

const buildDateGte = (value: Date): ReturnType<typeof gte> => {
  return gte(usageLogs.createdAt, value);
};

const buildDateLte = (value: Date): ReturnType<typeof lte> => {
  return lte(usageLogs.createdAt, value);
};

const buildDateLt = (value: Date): ReturnType<typeof lt> => {
  return lt(usageLogs.createdAt, value);
};

export type SystemUsageStats = {
  totalOperations: number;
  byOperation: Record<Operation, number>;
  byProvider: {
    platform: number;
  };
  totalCost: number;
  uniqueUsers: number;
};

/**
 * Usage Log Repository
 *
 * Data access layer for usage_logs table
 * Tracks operations for rate limiting, billing, and analytics
 */
export const usageLogRepository = {
  /**
   * Find usage log by ID
   */
  async findById(id: string): Promise<UsageLog | null> {
    const result = await db.select().from(usageLogs).where(eq(usageLogs.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Log an operation
   * Called after every parse, generate, or export operation
   */
  async log(data: {
    userId: string;
    operation: Operation;
    providerType: ProviderType;
    usageContext?: UsageContext | null;
    tokensUsed?: number;
    cost?: number;
  }): Promise<UsageLog> {
    const result = await db
      .insert(usageLogs)
      .values({
        userId: data.userId,
        operation: data.operation,
        providerType: data.providerType,
        usageContext: data.usageContext ?? null,
        tokensUsed: data.tokensUsed ?? null,
        cost: data.cost?.toString() ?? null
      })
      .returning();
    return result[0]!;
  },

  /**
   * Get daily count for user and operation
   * Used for rate limiting (check daily limits)
   */
  async getDailyCount(userId: string, operation: Operation): Promise<number> {
    const today = startOfDay(new Date());

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(
        and(eq(usageLogs.userId, userId), eq(usageLogs.operation, operation), buildDateGte(today))
      );

    return Number(result[0]?.count ?? 0);
  },

  /**
   * Get all usage logs for a user
   * Admin/analytics feature
   */
  async findByUserId(userId: string, limit = 100): Promise<UsageLog[]> {
    return await db.select().from(usageLogs).where(eq(usageLogs.userId, userId)).limit(limit);
  },

  /**
   * Get usage logs for a date range
   * Analytics and billing
   */
  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<UsageLog[]> {
    return await db
      .select()
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), buildDateGte(startDate), buildDateLte(endDate)));
  },

  /**
   * Get total cost for user in date range
   * Billing feature
   */
  async getTotalCost(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db
      .select({ total: sql<string>`sum(${usageLogs.cost})` })
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), buildDateGte(startDate), buildDateLte(endDate)));

    return Number(result[0]?.total ?? 0);
  },

  /**
   * Get total cost for user today by provider type
   */
  async getDailyCostByProvider(userId: string, providerType: ProviderType): Promise<number> {
    const today = startOfDay(new Date());

    const result = await db
      .select({ total: sql<string>`sum(${usageLogs.cost})` })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          eq(usageLogs.providerType, providerType),
          buildDateGte(today)
        )
      );

    return Number(result[0]?.total ?? 0);
  },

  /**
   * Get total tokens used for user in date range
   */
  async getTotalTokens(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${usageLogs.tokensUsed})` })
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), buildDateGte(startDate), buildDateLte(endDate)));

    return Number(result[0]?.total ?? 0);
  },

  /**
   * Get operation breakdown for user
   * Analytics: how many parse/generate/export operations
   */
  async getOperationBreakdown(userId: string, days = 30): Promise<Record<Operation, number>> {
    const startDate = subDays(new Date(), days);

    const result = await db
      .select({
        operation: usageLogs.operation,
        count: sql<number>`count(*)`
      })
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), buildDateGte(startDate)))
      .groupBy(usageLogs.operation);

    const breakdown: Record<Operation, number> = {
      parse: 0,
      generate: 0,
      export: 0
    };

    result.forEach(row => {
      breakdown[row.operation] = Number(row.count);
    });

    return breakdown;
  },

  /**
   * Get operation count for a user in an optional date range
   */
  async getOperationCount(
    userId: string,
    operation: Operation,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const conditions = [eq(usageLogs.userId, userId), eq(usageLogs.operation, operation)];

    if (startDate) {
      conditions.push(buildDateGte(startDate));
    }

    if (endDate) {
      conditions.push(buildDateLte(endDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageLogs)
      .where(and(...conditions));

    return Number(result[0]?.count ?? 0);
  },

  /**
   * Get platform vs BYOK usage ratio
   * Analytics: track how many users use BYOK
   */
  async getProviderTypeBreakdown(
    userId: string,
    days = 30
  ): Promise<{ platform: number; byok: number }> {
    const startDate = subDays(new Date(), days);

    const result = await db
      .select({
        providerType: usageLogs.providerType,
        count: sql<number>`count(*)`
      })
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), buildDateGte(startDate)))
      .groupBy(usageLogs.providerType);

    const breakdown = { platform: 0, byok: 0 };

    result.forEach(row => {
      breakdown[row.providerType] = Number(row.count);
    });

    return breakdown;
  },

  /**
   * Get system-wide usage stats since a start date
   */
  async getSystemStats(startDate: Date): Promise<SystemUsageStats> {
    const [totalResult, costResult, uniqueResult, operationResult, providerResult] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(usageLogs)
          .where(buildDateGte(startDate)),
        db
          .select({ total: sql<string>`sum(${usageLogs.cost})` })
          .from(usageLogs)
          .where(buildDateGte(startDate)),
        db
          .select({ count: sql<number>`count(distinct ${usageLogs.userId})` })
          .from(usageLogs)
          .where(buildDateGte(startDate)),
        db
          .select({
            operation: usageLogs.operation,
            count: sql<number>`count(*)`
          })
          .from(usageLogs)
          .where(buildDateGte(startDate))
          .groupBy(usageLogs.operation),
        db
          .select({
            providerType: usageLogs.providerType,
            count: sql<number>`count(*)`
          })
          .from(usageLogs)
          .where(buildDateGte(startDate))
          .groupBy(usageLogs.providerType)
      ]);

    const byOperation: Record<Operation, number> = {
      parse: 0,
      generate: 0,
      export: 0
    };

    operationResult.forEach(row => {
      byOperation[row.operation] = Number(row.count);
    });

    const byProvider = {
      platform: 0
    };

    providerResult.forEach(row => {
      byProvider.platform += Number(row.count);
    });

    return {
      totalOperations: Number(totalResult[0]?.count ?? 0),
      byOperation,
      byProvider,
      totalCost: Number(costResult[0]?.total ?? 0),
      uniqueUsers: Number(uniqueResult[0]?.count ?? 0)
    };
  },

  /**
   * Delete old logs (cleanup task)
   * Keep logs for compliance/billing period (e.g., 1 year)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = subDays(new Date(), days);

    const result = await db
      .delete(usageLogs)
      .where(buildDateLt(cutoffDate))
      .returning({ id: usageLogs.id });

    return result.length;
  },

  /**
   * Delete all usage logs for a user
   * Called during user account deletion
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(usageLogs).where(eq(usageLogs.userId, userId));
  }
};
