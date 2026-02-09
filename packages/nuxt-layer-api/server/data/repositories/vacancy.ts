import type { VacancyInput, VacancyListQuery } from '@int/schema';
import type { Vacancy } from '../schema';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { vacancies } from '../schema';

type VacancyMeta = Pick<Vacancy, 'id' | 'company' | 'jobPosition'>;
type VacancyUpdatePayload = Partial<VacancyInput> & {
  canGenerateResume?: boolean;
};

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
    const result = await db.select().from(vacancies).where(eq(vacancies.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find vacancy by ID and user ID (ownership check)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Vacancy | null> {
    const result = await db
      .select()
      .from(vacancies)
      .where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Find vacancy meta by ID and user ID (ownership check)
   */
  async findMetaByIdAndUserId(id: string, userId: string): Promise<VacancyMeta | null> {
    const result = await db
      .select({
        id: vacancies.id,
        company: vacancies.company,
        jobPosition: vacancies.jobPosition
      })
      .from(vacancies)
      .where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
      .limit(1);
    return result[0] ?? null;
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
      .orderBy(desc(vacancies.createdAt));
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
        notes: data.notes ?? null,
        canGenerateResume: true
      })
      .returning();
    return result[0]!;
  },

  /**
   * Update vacancy
   */
  async update(id: string, userId: string, data: VacancyUpdatePayload): Promise<Vacancy | null> {
    const result = await db
      .update(vacancies)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Delete vacancy
   * Also deletes associated generations (cascade)
   */
  async delete(id: string, userId: string): Promise<void> {
    await db.delete(vacancies).where(and(eq(vacancies.id, id), eq(vacancies.userId, userId)));
  },

  /**
   * Count vacancies for user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: vacancies.id })
      .from(vacancies)
      .where(eq(vacancies.userId, userId));
    return result.length;
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
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Delete all vacancies for a user
   * Called during user account deletion
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(vacancies).where(eq(vacancies.userId, userId));
  },

  /**
   * Find vacancies with server-side pagination, sorting, filtering, and search
   * Returns items for the requested page plus totalItems for pagination metadata
   */
  async findPaginated(
    userId: string,
    params: Omit<VacancyListQuery, 'currentPage' | 'pageSize'> & {
      currentPage: number;
      pageSize: number;
    }
  ): Promise<{ items: Vacancy[]; totalItems: number }> {
    const { currentPage, pageSize, sortBy, sortOrder, status, search } = params;
    const offset = (currentPage - 1) * pageSize;

    // Build filter conditions
    const filters = [eq(vacancies.userId, userId)];

    if (status && status.length > 0) {
      filters.push(inArray(vacancies.status, status));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      filters.push(
        or(ilike(vacancies.company, searchPattern), ilike(vacancies.jobPosition, searchPattern))!
      );
    }

    const whereClause = and(...filters);

    // Build order clause
    const orderClause = sortBy
      ? [sortOrder === 'asc' ? asc(vacancies[sortBy]) : desc(vacancies[sortBy])]
      : [
          // Default: status-group ordering + updatedAt DESC
          sql`CASE ${vacancies.status}
            WHEN 'created' THEN 1
            WHEN 'generated' THEN 2
            WHEN 'screening' THEN 3
            WHEN 'interview' THEN 4
            WHEN 'offer' THEN 5
            WHEN 'rejected' THEN 6
          END`,
          desc(vacancies.updatedAt)
        ];

    // Execute data + count queries
    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(vacancies)
        .where(whereClause)
        .orderBy(...orderClause)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(vacancies)
        .where(whereClause)
    ]);

    const totalItems = Number(countResult[0]?.count ?? 0);

    return { items, totalItems };
  },

  /**
   * Bulk delete vacancies by IDs
   * Verifies all IDs belong to the user before deleting
   * Uses a transaction for atomicity
   */
  async bulkDelete(ids: string[], userId: string): Promise<void> {
    await db.transaction(async tx => {
      // Verify all IDs belong to the user
      const owned = await tx
        .select({ id: vacancies.id })
        .from(vacancies)
        .where(and(inArray(vacancies.id, ids), eq(vacancies.userId, userId)));

      if (owned.length !== ids.length) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden: some vacancy IDs do not belong to the current user'
        });
      }

      // Delete all (cascade will handle generations)
      await tx
        .delete(vacancies)
        .where(and(inArray(vacancies.id, ids), eq(vacancies.userId, userId)));
    });
  }
};
