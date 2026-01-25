import type { ResumeContent, SourceFileType } from '@int/schema';
import type { Resume } from '../schema';
import { and, desc, eq } from 'drizzle-orm';
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
  }): Promise<Resume> {
    const result = await db
      .insert(resumes)
      .values({
        userId: data.userId,
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
  }
};
