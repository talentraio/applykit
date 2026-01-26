import type { Operation, ProviderType } from '@int/schema';
import type { UsageLog } from '../schema';
import { startOfDay, subDays } from 'date-fns';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { usageLogs } from '../schema';

export type SystemUsageStats = {
  totalOperations: number;
  byOperation: Record<Operation, number>;
  byProvider: Record<ProviderType, number>;
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
    tokensUsed?: number;
    cost?: number;
  }): Promise<UsageLog> {
    const result = await db
      .insert(usageLogs)
      .values({
        userId: data.userId,
        operation: data.operation,
        providerType: data.providerType,
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
        and(
          eq(usageLogs.userId, userId),
          eq(usageLogs.operation, operation),
          gte(usageLogs.createdAt, today)
        )
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
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startDate),
          sql`${usageLogs.createdAt} <= ${endDate}`
        )
      );
  },

  /**
   * Get total cost for user in date range
   * Billing feature
   */
  async getTotalCost(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db
      .select({ total: sql<string>`sum(${usageLogs.cost})` })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startDate),
          sql`${usageLogs.createdAt} <= ${endDate}`
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
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startDate),
          sql`${usageLogs.createdAt} <= ${endDate}`
        )
      );

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
      .where(and(eq(usageLogs.userId, userId), gte(usageLogs.createdAt, startDate)))
      .groupBy(usageLogs.operation);

    const breakdown: Record<Operation, number> = {
      parse: 0,
      generate: 0,
      export: 0
    };

    result.forEach(row => {
      breakdown[row.operation as Operation] = Number(row.count);
    });

    return breakdown;
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
      .where(and(eq(usageLogs.userId, userId), gte(usageLogs.createdAt, startDate)))
      .groupBy(usageLogs.providerType);

    const breakdown = { platform: 0, byok: 0 };

    result.forEach(row => {
      breakdown[row.providerType as ProviderType] = Number(row.count);
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
          .where(gte(usageLogs.createdAt, startDate)),
        db
          .select({ total: sql<string>`sum(${usageLogs.cost})` })
          .from(usageLogs)
          .where(gte(usageLogs.createdAt, startDate)),
        db
          .select({ count: sql<number>`count(distinct ${usageLogs.userId})` })
          .from(usageLogs)
          .where(gte(usageLogs.createdAt, startDate)),
        db
          .select({
            operation: usageLogs.operation,
            count: sql<number>`count(*)`
          })
          .from(usageLogs)
          .where(gte(usageLogs.createdAt, startDate))
          .groupBy(usageLogs.operation),
        db
          .select({
            providerType: usageLogs.providerType,
            count: sql<number>`count(*)`
          })
          .from(usageLogs)
          .where(gte(usageLogs.createdAt, startDate))
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

    const byProvider: Record<ProviderType, number> = {
      platform: 0,
      byok: 0
    };

    providerResult.forEach(row => {
      byProvider[row.providerType] = Number(row.count);
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
      .where(sql`${usageLogs.createdAt} < ${cutoffDate}`)
      .returning({ id: usageLogs.id });

    return result.length;
  }
};
