import type { Operation, Role } from '@int/schema';
import { getDailyUsageCount } from '../../utils/usage';

/**
 * Limits Service
 *
 * Role-based daily operation limits
 * Prevents abuse and manages fair usage across user tiers
 *
 * Daily Limits:
 * - public: 3 parse, 2 generate, 5 export
 * - friend: 10 parse, 8 generate, 20 export
 * - super_admin: unlimited
 *
 * Related: T043, TX020
 */

/**
 * Daily operation limits by role
 */
const DAILY_LIMITS: Record<Role, Record<Operation, number>> = {
  public: {
    parse: 3,
    generate: 2,
    export: 5
  },
  friend: {
    parse: 10,
    generate: 8,
    export: 20
  },
  super_admin: {
    parse: Number.POSITIVE_INFINITY,
    generate: Number.POSITIVE_INFINITY,
    export: Number.POSITIVE_INFINITY
  }
};

/**
 * Check if user can perform operation (hasn't hit daily limit)
 *
 * @param userId - User ID
 * @param operation - Operation type (parse, generate, export)
 * @param role - User role
 * @returns true if within limit, false if limit exceeded
 */
export async function checkLimit(
  userId: string,
  operation: Operation,
  role: Role
): Promise<boolean> {
  // Super admin has no limits
  if (role === 'super_admin') {
    return true;
  }

  const limit = DAILY_LIMITS[role][operation];
  const used = await getDailyUsageCount(userId, operation);

  return used < limit;
}

/**
 * Get remaining operations for today
 *
 * @param userId - User ID
 * @param operation - Operation type
 * @param role - User role
 * @returns Number of operations remaining
 */
export async function getRemainingLimit(
  userId: string,
  operation: Operation,
  role: Role
): Promise<number> {
  // Super admin has effectively unlimited
  if (role === 'super_admin') {
    return Number.POSITIVE_INFINITY;
  }

  const limit = DAILY_LIMITS[role][operation];
  const used = await getDailyUsageCount(userId, operation);

  return Math.max(0, limit - used);
}

/**
 * Get daily limit for role and operation
 *
 * @param role - User role
 * @param operation - Operation type
 * @returns Daily limit
 */
export function getDailyLimit(role: Role, operation: Operation): number {
  return DAILY_LIMITS[role][operation];
}

/**
 * Check limit and throw error if exceeded
 * Convenience function for route handlers
 *
 * @param userId - User ID
 * @param operation - Operation type
 * @param role - User role
 * @throws 429 error if limit exceeded
 */
export async function requireLimit(
  userId: string,
  operation: Operation,
  role: Role
): Promise<void> {
  const canProceed = await checkLimit(userId, operation, role);

  if (!canProceed) {
    const limit = getDailyLimit(role, operation);
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: `Daily ${operation} limit exceeded. Limit: ${limit} per day.`,
      data: {
        operation,
        limit,
        resetAt: getResetTime()
      }
    });
  }
}

/**
 * Get time when daily limits reset (midnight UTC)
 * @returns ISO timestamp of next reset
 */
function getResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0); // Next midnight UTC
  return tomorrow.toISOString();
}

/**
 * Get all limits for a role
 *
 * @param role - User role
 * @returns All operation limits for the role
 */
export function getAllLimits(role: Role): Record<Operation, number> {
  return DAILY_LIMITS[role];
}

/**
 * Get usage summary for a user
 *
 * @param userId - User ID
 * @param role - User role
 * @returns Usage and limits for all operations
 */
export async function getUsageSummary(
  userId: string,
  role: Role
): Promise<{
  role: Role;
  operations: Array<{
    operation: Operation;
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  }>;
  resetAt: string;
}> {
  const operations: Operation[] = ['parse', 'generate', 'export'];

  const operationStats = await Promise.all(
    operations.map(async operation => {
      const limit = getDailyLimit(role, operation);
      const used = await getDailyUsageCount(userId, operation);
      const remaining = Math.max(0, limit - used);
      const percentage = limit === Number.POSITIVE_INFINITY ? 0 : Math.round((used / limit) * 100);

      return {
        operation,
        used,
        limit,
        remaining,
        percentage
      };
    })
  );

  return {
    role,
    operations: operationStats,
    resetAt: getResetTime()
  };
}
