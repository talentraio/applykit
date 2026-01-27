import process from 'node:process';
import { generationRepository } from '../data/repositories/generation';
import { usageLogRepository } from '../data/repositories/usage-log';

/**
 * Background Cleanup Task
 *
 * Removes expired generations and old usage logs to prevent database bloat.
 * Designed to be triggered by Vercel Cron Jobs.
 *
 * - Expired generations: removed immediately (expiresAt < now)
 * - Old usage logs: kept for 1 year for compliance/billing
 *
 * T156 [Phase 12] Background cleanup task
 *
 * @see /vercel.json for cron configuration
 */

export default defineEventHandler(async event => {
  // Security: only allow from Vercel Cron (or local dev)
  const authHeader = getHeader(event, 'authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized: Invalid cron secret'
      });
    }
  }

  const startTime = Date.now();
  const results = {
    expiredGenerations: 0,
    oldUsageLogs: 0,
    errors: [] as string[]
  };

  try {
    // 1. Delete expired generations (expiresAt < now)
    console.warn('[Cleanup] Starting expired generation cleanup...');
    results.expiredGenerations = await generationRepository.deleteExpired();
    console.warn(`[Cleanup] Deleted ${results.expiredGenerations} expired generations`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Error deleting expired generations:', error);
    results.errors.push(`Expired generations: ${message}`);
  }

  try {
    // 2. Delete old usage logs (older than 365 days)
    // Keep logs for 1 year for compliance/billing purposes
    console.warn('[Cleanup] Starting old usage log cleanup...');
    results.oldUsageLogs = await usageLogRepository.deleteOlderThan(365);
    console.warn(`[Cleanup] Deleted ${results.oldUsageLogs} old usage logs`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Error deleting old usage logs:', error);
    results.errors.push(`Old usage logs: ${message}`);
  }

  const duration = Date.now() - startTime;
  console.warn(`[Cleanup] Task completed in ${duration}ms`);

  return {
    success: results.errors.length === 0,
    duration,
    results
  };
});
