import type { ResumeContent } from '@int/schema';
import type { Generation } from '../schema';
import { addDays, endOfDay } from 'date-fns';
import { desc, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { generations, vacancies } from '../schema';

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
    const result = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
    return result[0] ?? null;
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
      .orderBy(desc(generations.generatedAt));
  },

  /**
   * Find latest generation for a vacancy
   * Returns most recent non-expired generation
   */
  async findLatestByVacancyId(vacancyId: string): Promise<Generation | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
      .orderBy(desc(generations.generatedAt))
      .limit(1);

    const generation = result[0];
    if (!generation) return null;

    if (generation.expiresAt < now) {
      return null;
    }

    return generation;
  },

  /**
   * Create new generation
   * Called after LLM generates tailored resume
   */
  async create(data: {
    vacancyId: string;
    resumeId: string;
    content: ResumeContent;
    matchScoreBefore: number;
    matchScoreAfter: number;
  }): Promise<Generation> {
    // Set expiration to end of day (23:59:59.999) 90 days from now
    // This makes expiration more predictable and user-friendly
    const expiresAt = endOfDay(addDays(new Date(), 90));

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
      .returning();

    const created = result[0];
    if (!created) {
      throw new Error('Failed to create generation');
    }

    return created;
  },

  /**
   * Update generation content
   * Allows editing generated resume (for vacancy flow)
   */
  async updateContent(id: string, content: ResumeContent): Promise<Generation | null> {
    const result = await db
      .update(generations)
      .set({ content })
      .where(eq(generations.id, id))
      .returning();

    return result[0] ?? null;
  },

  /**
   * Delete generation
   */
  async delete(id: string): Promise<void> {
    await db.delete(generations).where(eq(generations.id, id));
  },

  /**
   * Delete all generations for a vacancy
   */
  async deleteByVacancyId(vacancyId: string): Promise<void> {
    await db.delete(generations).where(eq(generations.vacancyId, vacancyId));
  },

  /**
   * Delete all generations for a resume
   */
  async deleteByResumeId(resumeId: string): Promise<void> {
    await db.delete(generations).where(eq(generations.resumeId, resumeId));
  },

  /**
   * Find all expired generations
   * Used by cleanup task to remove old data
   */
  async findExpired(): Promise<Generation[]> {
    const now = new Date();
    return await db.select().from(generations).where(lt(generations.expiresAt, now));
  },

  /**
   * Delete all expired generations
   * Called by scheduled cleanup task
   */
  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(generations)
      .where(lt(generations.expiresAt, now))
      .returning({ id: generations.id });
    return result.length;
  },

  /**
   * Count generations for a vacancy
   */
  async countByVacancyId(vacancyId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId));

    return Number(result[0]?.count ?? 0);
  },

  /**
   * Count generations for a user (via vacancy ownership)
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .innerJoin(vacancies, eq(generations.vacancyId, vacancies.id))
      .where(eq(vacancies.userId, userId));

    return Number(result[0]?.count ?? 0);
  }
};
