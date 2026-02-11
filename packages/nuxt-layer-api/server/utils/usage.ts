import type { Operation, ProviderType, UsageContext } from '@int/schema';
import { OPERATION_MAP, USAGE_CONTEXT_MAP } from '@int/schema';
import { addDays, startOfDay } from 'date-fns';
import { usageLogRepository } from '../data/repositories';

/**
 * Usage Tracking Utility
 *
 * Logs operations to usage_logs table for analytics and rate limiting
 * Tracks tokens used, cost, and provider source
 *
 * Related: T045, TX020
 */

/**
 * Log an operation to usage_logs table
 *
 * @param userId - User performing the operation
 * @param operation - Type of operation (parse, generate, export)
 * @param providerType - Provider source
 * @param usageContext - Optional usage context
 * @param tokensUsed - Optional token count
 * @param cost - Optional cost in USD
 */
export async function logUsage(
  userId: string,
  operation: Operation,
  providerType: ProviderType,
  usageContext?: UsageContext | null,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await usageLogRepository.log({
    userId,
    operation,
    providerType,
    usageContext: usageContext ?? null,
    tokensUsed,
    cost
  });
}

/**
 * Get daily operation count for a user
 *
 * @param userId - User ID
 * @param operation - Operation type
 * @returns Number of operations today
 */
export async function getDailyUsageCount(userId: string, operation: Operation): Promise<number> {
  return await usageLogRepository.getDailyCount(userId, operation);
}

/**
 * Get total tokens used today by a user
 *
 * @param userId - User ID
 * @returns Total tokens used today
 */
export async function getDailyTokensUsed(userId: string): Promise<number> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return await usageLogRepository.getTotalTokens(userId, today, tomorrow);
}

/**
 * Get total cost today for a user
 *
 * @param userId - User ID
 * @returns Total cost in USD
 */
export async function getDailyCost(userId: string): Promise<number> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  return await usageLogRepository.getTotalCost(userId, today, tomorrow);
}

/**
 * Get usage statistics for a date range
 *
 * @param userId - User ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Usage logs for the period
 */
export async function getUsageHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): ReturnType<typeof usageLogRepository.findByDateRange> {
  return await usageLogRepository.findByDateRange(userId, startDate, endDate);
}

/**
 * Helper to log parse operation
 */
export async function logParse(
  userId: string,
  providerType: ProviderType,
  usageContext?: UsageContext | null,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, OPERATION_MAP.PARSE, providerType, usageContext, tokensUsed, cost);
}

/**
 * Helper to log generate operation
 */
export async function logGenerate(
  userId: string,
  providerType: ProviderType,
  usageContext?: UsageContext | null,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, OPERATION_MAP.GENERATE, providerType, usageContext, tokensUsed, cost);
}

/**
 * Helper to log resume adaptation generate usage.
 */
export async function logGenerateAdaptation(
  userId: string,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logGenerate(userId, providerType, USAGE_CONTEXT_MAP.RESUME_ADAPTATION, tokensUsed, cost);
}

/**
 * Helper to log resume adaptation scoring usage.
 */
export async function logGenerateScoring(
  userId: string,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logGenerate(
    userId,
    providerType,
    USAGE_CONTEXT_MAP.RESUME_ADAPTATION_SCORING,
    tokensUsed,
    cost
  );
}

/**
 * Helper to log export operation
 */
export async function logExport(
  userId: string,
  providerType: ProviderType,
  usageContext?: UsageContext | null,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, OPERATION_MAP.EXPORT, providerType, usageContext, tokensUsed, cost);
}
