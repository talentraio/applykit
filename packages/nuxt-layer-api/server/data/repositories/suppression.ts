import type { SuppressionReason } from '@int/schema';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { userSuppression } from '../schema';

/**
 * Suppression Repository
 *
 * Data access layer for the user_suppression table.
 * Manages email HMAC fingerprints for anti-abuse protection.
 */
export const suppressionRepository = {
  /**
   * Create a suppression record.
   * @param emailHmac - HMAC-SHA256 hex of the normalized email
   * @param reason - Suppression reason
   * @param sourceUserId - Optional audit link to the original user (no FK)
   * @param ttlDays - Days until expiration (default from runtimeConfig)
   */
  async create(
    emailHmac: string,
    reason: SuppressionReason,
    sourceUserId?: string,
    ttlDays?: number
  ): Promise<void> {
    const config = useRuntimeConfig();
    const days = ttlDays ?? Number(config.suppressionTtlDays ?? 180);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db
      .insert(userSuppression)
      .values({
        emailHmac,
        reason,
        sourceUserId: sourceUserId ?? null,
        expiresAt
      })
      .onConflictDoNothing();
  },

  /**
   * Check if an email HMAC is currently suppressed (non-expired).
   */
  async isEmailSuppressed(emailHmac: string): Promise<boolean> {
    const result = await db
      .select({ id: userSuppression.id })
      .from(userSuppression)
      .where(
        and(eq(userSuppression.emailHmac, emailHmac), lt(sql`now()`, userSuppression.expiresAt))
      )
      .limit(1);

    return result.length > 0;
  },

  /**
   * Remove suppression by email HMAC.
   * Used by admin hard delete flow to allow future re-registration.
   * @returns Number of deleted rows
   */
  async deleteByEmailHmac(emailHmac: string): Promise<number> {
    const result = await db
      .delete(userSuppression)
      .where(eq(userSuppression.emailHmac, emailHmac))
      .returning({ id: userSuppression.id });

    return result.length;
  },

  /**
   * Delete expired suppression records.
   * @returns Number of deleted rows
   */
  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(userSuppression)
      .where(lt(userSuppression.expiresAt, sql`now()`))
      .returning({ id: userSuppression.id });

    return result.length;
  }
};
