import type { ResumeContent } from '@int/schema'
import type { Generation } from '../schema'
import { desc, eq, lt } from 'drizzle-orm'
import { db } from '../db'
import { generations } from '../schema'

/**
 * Generation Repository
 *
 * Data access layer for generations table
 * Handles tailored resume versions (expire after 90 days)
 */
export const generationRepository = {
  /**
   * Find generation by ID
   */
  async findById(id: string): Promise<Generation | null> {
    const result = await db.select().from(generations).where(eq(generations.id, id)).limit(1)
    return result[0] ?? null
  },

  /**
   * Find all generations for a vacancy
   * Ordered by most recent first
   */
  async findByVacancyId(vacancyId: string): Promise<Generation[]> {
    return await db
      .select()
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
      .orderBy(desc(generations.generatedAt))
  },

  /**
   * Find latest generation for a vacancy
   * Returns most recent non-expired generation
   */
  async findLatestByVacancyId(vacancyId: string): Promise<Generation | null> {
    const now = new Date()
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
      .orderBy(desc(generations.generatedAt))
      .limit(1)

    const generation = result[0] ?? null
    // Check if expired
    if (generation && generation.expiresAt < now) {
      return null
    }
    return generation
  },

  /**
   * Create new generation
   * Called after LLM generates tailored resume
   */
  async create(data: {
    vacancyId: string
    resumeId: string
    content: ResumeContent
    matchScoreBefore: number
    matchScoreAfter: number
  }): Promise<Generation> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90) // 90 days lifetime

    const result = await db
      .insert(generations)
      .values({
        vacancyId: data.vacancyId,
        resumeId: data.resumeId,
        content: data.content,
        matchScoreBefore: data.matchScoreBefore,
        matchScoreAfter: data.matchScoreAfter,
        expiresAt
      })
      .returning()
    return result[0]
  },

  /**
   * Delete generation
   */
  async delete(id: string): Promise<void> {
    await db.delete(generations).where(eq(generations.id, id))
  },

  /**
   * Delete all generations for a vacancy
   */
  async deleteByVacancyId(vacancyId: string): Promise<void> {
    await db.delete(generations).where(eq(generations.vacancyId, vacancyId))
  },

  /**
   * Delete all generations for a resume
   */
  async deleteByResumeId(resumeId: string): Promise<void> {
    await db.delete(generations).where(eq(generations.resumeId, resumeId))
  },

  /**
   * Find all expired generations
   * Used by cleanup task to remove old data
   */
  async findExpired(): Promise<Generation[]> {
    const now = new Date()
    return await db.select().from(generations).where(lt(generations.expiresAt, now))
  },

  /**
   * Delete all expired generations
   * Called by scheduled cleanup task
   */
  async deleteExpired(): Promise<number> {
    const now = new Date()
    const result = await db
      .delete(generations)
      .where(lt(generations.expiresAt, now))
      .returning({ id: generations.id })
    return result.length
  },

  /**
   * Count generations for a vacancy
   */
  async countByVacancyId(vacancyId: string): Promise<number> {
    const result = await db
      .select({ count: generations.id })
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
    return result.length
  },

  /**
   * Check if generation exists and is not expired
   */
  async isValidGeneration(id: string): Promise<boolean> {
    const generation = await this.findById(id)
    if (!generation) return false

    const now = new Date()
    return generation.expiresAt > now
  }
}
