import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { llmKeys } from '../schema'
import type { LLMKey, NewLLMKey } from '../schema'
import type { LLMProvider } from '@int/schema'

/**
 * LLM Key Repository
 *
 * Data access layer for llm_keys table
 * CRITICAL SECURITY: Only stores last 4 characters as hint
 * Full keys are stored in browser localStorage only
 */
export const llmKeyRepository = {
  /**
   * Find key by ID
   */
  async findById(id: string): Promise<LLMKey | null> {
    const result = await db.select().from(llmKeys).where(eq(llmKeys.id, id)).limit(1)
    return result[0] ?? null
  },

  /**
   * Find key by user ID and provider
   * One key per provider per user
   */
  async findByUserAndProvider(userId: string, provider: LLMProvider): Promise<LLMKey | null> {
    const result = await db
      .select()
      .from(llmKeys)
      .where(and(eq(llmKeys.userId, userId), eq(llmKeys.provider, provider)))
      .limit(1)
    return result[0] ?? null
  },

  /**
   * Find all keys for a user
   * Returns metadata only (hint, provider, created date)
   */
  async findByUserId(userId: string): Promise<LLMKey[]> {
    return await db.select().from(llmKeys).where(eq(llmKeys.userId, userId))
  },

  /**
   * Store key metadata
   * CRITICAL: Only stores last 4 characters as hint
   * Replaces existing key for same provider
   */
  async upsert(userId: string, provider: LLMProvider, keyHint: string): Promise<LLMKey> {
    // Check if key exists
    const existing = await this.findByUserAndProvider(userId, provider)

    if (existing) {
      // Update existing
      const result = await db
        .update(llmKeys)
        .set({ keyHint })
        .where(and(eq(llmKeys.userId, userId), eq(llmKeys.provider, provider)))
        .returning()
      return result[0]
    } else {
      // Insert new
      const result = await db.insert(llmKeys).values({
        userId,
        provider,
        keyHint,
      }).returning()
      return result[0]
    }
  },

  /**
   * Delete key metadata
   * User-initiated removal of BYOK key
   */
  async delete(id: string, userId: string): Promise<void> {
    await db.delete(llmKeys).where(and(eq(llmKeys.id, id), eq(llmKeys.userId, userId)))
  },

  /**
   * Delete all keys for a user
   * Called during user account deletion
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(llmKeys).where(eq(llmKeys.userId, userId))
  },

  /**
   * Check if user has key for provider
   */
  async hasKeyForProvider(userId: string, provider: LLMProvider): Promise<boolean> {
    const result = await db
      .select({ id: llmKeys.id })
      .from(llmKeys)
      .where(and(eq(llmKeys.userId, userId), eq(llmKeys.provider, provider)))
      .limit(1)
    return result.length > 0
  },

  /**
   * Get key hint for display
   * Returns "•••• HINT" format for UI
   */
  async getKeyHint(userId: string, provider: LLMProvider): Promise<string | null> {
    const key = await this.findByUserAndProvider(userId, provider)
    if (!key) return null
    return `•••• ${key.keyHint}`
  },
}
