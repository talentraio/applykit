import type { ResumeContent, SourceFileType } from '@int/schema';
import type { Resume } from '../schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { resumes } from '../schema';

/**
 * Resume Repository
 *
 * Data access layer for resumes table
 * Handles uploaded resumes (parsed from DOCX/PDF)
 */
export const resumeRepository = {
  /**
   * Find resume by ID
   */
  async findById(id: string): Promise<Resume | null> {
    const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find resume by ID and user ID (ownership check)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Resume | null> {
    const result = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Find all resumes for a user
   * Ordered by most recent first
   */
  async findByUserId(userId: string): Promise<Resume[]> {
    return await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt));
  },

  /**
   * Create new resume
   * Called after parsing uploaded file
   */
  async create(data: {
    userId: string;
    title: string;
    content: ResumeContent;
    sourceFileName: string;
    sourceFileType: SourceFileType;
    name?: string;
  }): Promise<Resume> {
    const result = await db
      .insert(resumes)
      .values({
        userId: data.userId,
        name: data.name ?? '',
        title: data.title,
        content: data.content,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType
      })
      .returning();
    return result[0]!;
  },

  /**
   * Update resume content
   * Users can edit parsed resume JSON
   */
  async updateContent(id: string, userId: string, content: ResumeContent): Promise<Resume | null> {
    const result = await db
      .update(resumes)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Update resume title
   */
  async updateTitle(id: string, userId: string, title: string): Promise<Resume | null> {
    const result = await db
      .update(resumes)
      .set({
        title,
        updatedAt: new Date()
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Replace base resume data (title, content, source metadata)
   * Used by "clear and create new" flow in single-resume architecture
   */
  async replaceBaseData(
    id: string,
    userId: string,
    data: {
      title: string;
      content: ResumeContent;
      sourceFileName: string;
      sourceFileType: SourceFileType;
    }
  ): Promise<Resume | null> {
    const result = await db
      .update(resumes)
      .set({
        title: data.title,
        content: data.content,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType,
        updatedAt: new Date()
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Delete resume
   * Also deletes associated generations (cascade)
   */
  async delete(id: string, userId: string): Promise<void> {
    await db.delete(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  },

  /**
   * Count resumes for user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select({ count: resumes.id })
      .from(resumes)
      .where(eq(resumes.userId, userId));
    return result.length;
  },

  /**
   * Get user's most recent resume
   */
  async findLatestByUserId(userId: string): Promise<Resume | null> {
    const result = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Delete all resumes for a user
   * Called during user account deletion
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.delete(resumes).where(eq(resumes.userId, userId));
  },

  /**
   * Find lightweight resume list for a user (id, name, createdAt, updatedAt)
   * Sorted by createdAt DESC. Caller is responsible for sorting default first.
   */
  async findListByUserId(
    userId: string
  ): Promise<Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>> {
    return await db
      .select({
        id: resumes.id,
        name: resumes.name,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt));
  },

  /**
   * Update resume name
   */
  async updateName(id: string, userId: string, name: string): Promise<Resume | null> {
    const result = await db
      .update(resumes)
      .set({
        name,
        updatedAt: new Date()
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Duplicate a resume (deep clone content, title, source metadata)
   * Sets new name and returns the newly created resume.
   */
  async duplicate(sourceId: string, userId: string, newName: string): Promise<Resume | null> {
    const source = await this.findByIdAndUserId(sourceId, userId);
    if (!source) return null;

    const result = await db
      .insert(resumes)
      .values({
        userId,
        name: newName,
        title: source.title,
        content: source.content,
        sourceFileName: source.sourceFileName,
        sourceFileType: source.sourceFileType
      })
      .returning();
    return result[0]!;
  },

  /**
   * Count resumes for user using SQL COUNT for efficiency
   */
  async countByUserIdExact(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resumes)
      .where(eq(resumes.userId, userId));
    return result[0]?.count ?? 0;
  }
};
