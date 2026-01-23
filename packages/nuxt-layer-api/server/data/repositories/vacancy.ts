import type { VacancyInput } from '@int/schema'
import type { Vacancy } from '../schema'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { vacancies } from '../schema'

/**
 * Vacancy Repository
 *
 * Data access layer for vacancies table
 * Handles job vacancies for which users tailor resumes
 */
export const vacancyRepository = {
  /**
   * Find vacancy by ID
   */
  async findById(id: string): Promise<Vacancy | null> {
    const result = await db.select().from(vacancies).where(eq(vacancies.id, id)).limit(1)
    return result[0] ?? null
  },

  /**
   * Find vacancy by ID and user ID (ownership check)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Vacancy | null> {
    const result = await db
      .select()
      .from(vacancies)
      .where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
      .limit(1)
    return result[0] ?? null
  },

  /**
   * Find all vacancies for a user
   * Ordered by most recent first
   */
  async findByUserId(userId: string): Promise<Vacancy[]> {
    return await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.userId, userId))
      .orderBy(desc(vacancies.createdAt))
  },

  /**
   * Create new vacancy
   */
  async create(userId: string, data: VacancyInput): Promise<Vacancy> {
    const result = await db
      .insert(vacancies)
      .values({
        userId,
        company: data.company,
        jobPosition: data.jobPosition ?? null,
        description: data.description,
        url: data.url ?? null,
        notes: data.notes ?? null
      })
      .returning()
    return result[0]
  },

  /**
   * Update vacancy
   */
  async update(id: string, userId: string, data: Partial<VacancyInput>): Promise<Vacancy | null> {
    const result = await db
      .update(vacancies)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
      .returning()
    return result[0] ?? null
  },

  /**
   * Delete vacancy
   * Also deletes associated generations (cascade)
   */
  async delete(id: string, userId: string): Promise<void> {
    await db.delete(vacancies).where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
  },

  /**
   * Count vacancies for user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: vacancies.id })
      .from(vacancies)
      .where(eq(vacancies.userId, userId))
    return result.length
  },

  /**
   * Get user's most recent vacancy
   */
  async findLatestByUserId(userId: string): Promise<Vacancy | null> {
    const result = await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.userId, userId))
      .orderBy(desc(vacancies.createdAt))
      .limit(1)
    return result[0] ?? null
  }
}
