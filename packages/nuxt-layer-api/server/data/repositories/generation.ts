import type { ResumeContent } from '@int/schema';
import type { Generation } from '../schema';
import { addDays, endOfDay, parseISO } from 'date-fns';
import { desc, eq, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { generations, vacancies } from '../schema';

/**
 * Parse date from database value
 * Handles both SQLite (ISO strings) and PostgreSQL (Date objects)
 */
function parseDbDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();
  if (typeof value === 'string') return parseISO(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  // Fallback for Invalid Date
  return new Date();
}

/**
 * Raw generation row type from SQL query
 * Dates are selected as raw strings to bypass Drizzle's broken timestamp parsing with SQLite
 */
type GenerationRaw = {
  id: string;
  vacancyId: string;
  resumeId: string;
  content: ResumeContent;
  matchScoreBefore: number;
  matchScoreAfter: number;
  generatedAtRaw: string | null;
  expiresAtRaw: string | null;
};

/**
 * Select fields for generation queries
 * Uses raw SQL for date fields to get strings instead of Invalid Date objects
 */
const generationSelectFields = {
  id: generations.id,
  vacancyId: generations.vacancyId,
  resumeId: generations.resumeId,
  content: generations.content,
  matchScoreBefore: generations.matchScoreBefore,
  matchScoreAfter: generations.matchScoreAfter,
  // Select dates as raw text to bypass Drizzle's timestamp parsing
  generatedAtRaw: sql<string>`generated_at`,
  expiresAtRaw: sql<string>`expires_at`
};

/**
 * Convert raw DB row to Generation with proper Date objects
 */
function rawToGeneration(raw: GenerationRaw): Generation {
  return {
    id: raw.id,
    vacancyId: raw.vacancyId,
    resumeId: raw.resumeId,
    content: raw.content,
    matchScoreBefore: raw.matchScoreBefore,
    matchScoreAfter: raw.matchScoreAfter,
    generatedAt: parseDbDate(raw.generatedAtRaw),
    expiresAt: parseDbDate(raw.expiresAtRaw)
  };
}

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
    const result = await db
      .select(generationSelectFields)
      .from(generations)
      .where(eq(generations.id, id))
      .limit(1);
    return result[0] ? rawToGeneration(result[0] as GenerationRaw) : null;
  },

  /**
   * Find all generations for a vacancy
   * Ordered by most recent first
   */
  async findByVacancyId(vacancyId: string): Promise<Generation[]> {
    const results = await db
      .select(generationSelectFields)
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
      .orderBy(desc(generations.generatedAt));
    return results.map(row => rawToGeneration(row as GenerationRaw));
  },

  /**
   * Find latest generation for a vacancy
   * Returns most recent non-expired generation
   */
  async findLatestByVacancyId(vacancyId: string): Promise<Generation | null> {
    const now = new Date();
    const result = await db
      .select(generationSelectFields)
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId))
      .orderBy(desc(generations.generatedAt))
      .limit(1);

    if (!result[0]) return null;

    const generation = rawToGeneration(result[0] as GenerationRaw);

    // Check if expired
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
      .returning({ id: generations.id });

    // Re-query with raw SQL to get proper date strings
    const created = await this.findById(result[0]!.id);
    if (!created) {
      throw new Error('Failed to retrieve created generation');
    }
    return created;
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
    const results = await db
      .select(generationSelectFields)
      .from(generations)
      .where(lt(generations.expiresAt, now));
    return results.map(row => rawToGeneration(row as GenerationRaw));
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
      .select({ count: generations.id })
      .from(generations)
      .where(eq(generations.vacancyId, vacancyId));
    return result.length;
  },

  /**
   * Count generations for a user
   * Admin-only for user management stats
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .innerJoin(vacancies, eq(generations.vacancyId, vacancies.id))
      .where(eq(vacancies.userId, userId));
    return Number(result[0]?.count ?? 0);
  },

  /**
   * Check if generation exists and is not expired
   */
  async isValidGeneration(id: string): Promise<boolean> {
    const generation = await this.findById(id);
    if (!generation) return false;

    const now = new Date();
    return generation.expiresAt > now;
  }
};
