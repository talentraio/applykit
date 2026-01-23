import type { Operation, ProviderType } from '@int/schema'
import { usageLogRepository } from '../data/repositories'

/**
 * Usage Tracking Utility
 *
 * Logs operations to usage_logs table for analytics and rate limiting
 * Tracks tokens used, cost, and provider type (platform vs BYOK)
 *
 * Related: T045, TX020
 */

/**
 * Log an operation to usage_logs table
 *
 * @param userId - User performing the operation
 * @param operation - Type of operation (parse, generate, export)
 * @param providerType - Platform or BYOK
 * @param tokensUsed - Optional token count
 * @param cost - Optional cost in USD
 */
export async function logUsage(
  userId: string,
  operation: Operation,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await usageLogRepository.create({
    userId,
    operation,
    providerType,
    tokensUsed: tokensUsed ?? null,
    cost: cost?.toString() ?? null
  })
}

/**
 * Get daily operation count for a user
 *
 * @param userId - User ID
 * @param operation - Operation type
 * @returns Number of operations today
 */
export async function getDailyUsageCount(userId: string, operation: Operation): Promise<number> {
  return await usageLogRepository.getDailyCount(userId, operation)
}

/**
 * Get total tokens used today by a user
 *
 * @param userId - User ID
 * @returns Total tokens used today
 */
export async function getDailyTokensUsed(userId: string): Promise<number> {
  return await usageLogRepository.getDailyTokensUsed(userId)
}

/**
 * Get total cost today for a user
 *
 * @param userId - User ID
 * @returns Total cost in USD
 */
export async function getDailyCost(userId: string): Promise<number> {
  return await usageLogRepository.getDailyCost(userId)
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
): ReturnType<typeof usageLogRepository.findByUserAndDateRange> {
  return await usageLogRepository.findByUserAndDateRange(userId, startDate, endDate)
}

/**
 * Helper to log parse operation
 */
export async function logParse(
  userId: string,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, 'parse', providerType, tokensUsed, cost)
}

/**
 * Helper to log generate operation
 */
export async function logGenerate(
  userId: string,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, 'generate', providerType, tokensUsed, cost)
}

/**
 * Helper to log export operation
 */
export async function logExport(
  userId: string,
  providerType: ProviderType,
  tokensUsed?: number,
  cost?: number
): Promise<void> {
  await logUsage(userId, 'export', providerType, tokensUsed, cost)
}
