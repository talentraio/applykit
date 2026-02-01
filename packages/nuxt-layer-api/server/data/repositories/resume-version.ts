import type { ResumeContent } from '@int/schema';
import type { ResumeVersion } from '../schema';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { resumeVersions } from '../schema';

/**
 * Resume Version Repository
 *
 * Data access layer for resume_versions table
 * Manages version history for resumes
 */
export const resumeVersionRepository = {
  /**
   * Create a new version for a resume
   */
  async createVersion(data: {
    resumeId: string;
    content: ResumeContent;
    versionNumber: number;
  }): Promise<ResumeVersion> {
    const result = await db
      .insert(resumeVersions)
      .values({
        resumeId: data.resumeId,
        content: data.content,
        versionNumber: data.versionNumber
      })
      .returning();
    return result[0]!;
  },

  /**
   * Get all versions for a resume, ordered by version number (descending)
   */
  async getVersions(resumeId: string): Promise<ResumeVersion[]> {
    return await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.versionNumber));
  },

  /**
   * Get a specific version by number
   */
  async getVersion(resumeId: string, versionNumber: number): Promise<ResumeVersion | null> {
    const result = await db
      .select()
      .from(resumeVersions)
      .where(
        and(eq(resumeVersions.resumeId, resumeId), eq(resumeVersions.versionNumber, versionNumber))
      )
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Get the latest version number for a resume
   */
  async getLatestVersionNumber(resumeId: string): Promise<number> {
    const result = await db
      .select({ versionNumber: resumeVersions.versionNumber })
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.versionNumber))
      .limit(1);
    return result[0]?.versionNumber ?? 0;
  },

  /**
   * Delete old versions, keeping only the most recent ones
   * @param resumeId - Resume ID
   * @param keepCount - Number of versions to keep
   */
  async pruneOldVersions(resumeId: string, keepCount: number): Promise<void> {
    // Get all versions ordered by version number (descending)
    const allVersions = await db
      .select({ versionNumber: resumeVersions.versionNumber })
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId))
      .orderBy(desc(resumeVersions.versionNumber));

    // If we have more than keepCount versions, delete the oldest ones
    if (allVersions.length > keepCount) {
      const versionsToDelete = allVersions.slice(keepCount).map(v => v.versionNumber);

      for (const versionNumber of versionsToDelete) {
        await db
          .delete(resumeVersions)
          .where(
            and(
              eq(resumeVersions.resumeId, resumeId),
              eq(resumeVersions.versionNumber, versionNumber)
            )
          );
      }
    }
  },

  /**
   * Count versions for a resume
   */
  async countVersions(resumeId: string): Promise<number> {
    const result = await db
      .select({ count: resumeVersions.id })
      .from(resumeVersions)
      .where(eq(resumeVersions.resumeId, resumeId));
    return result.length;
  }
};
