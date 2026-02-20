import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import type { ResumeFormatSettingsRow } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { resumeFormatSettings } from '../schema';

/**
 * Resume Format Settings Repository
 *
 * Data access layer for resume_format_settings table.
 * Per-resume formatting preferences (replaces user_format_settings).
 * One-to-one relationship with resumes.
 */
export const resumeFormatSettingsRepository = {
  /**
   * Find format settings by resume ID
   */
  async findByResumeId(resumeId: string): Promise<ResumeFormatSettingsRow | null> {
    const result = await db
      .select()
      .from(resumeFormatSettings)
      .where(eq(resumeFormatSettings.resumeId, resumeId))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Create format settings for a resume
   */
  async create(
    resumeId: string,
    settings: { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }
  ): Promise<ResumeFormatSettingsRow> {
    const result = await db
      .insert(resumeFormatSettings)
      .values({
        resumeId,
        ats: settings.ats,
        human: settings.human
      })
      .returning();
    return result[0]!;
  },

  /**
   * Update format settings for a resume (partial — ats and/or human)
   */
  async update(
    resumeId: string,
    settings: { ats?: ResumeFormatSettingsAts; human?: ResumeFormatSettingsHuman }
  ): Promise<ResumeFormatSettingsRow | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (settings.ats !== undefined) {
      updateData.ats = settings.ats;
    }
    if (settings.human !== undefined) {
      updateData.human = settings.human;
    }

    const result = await db
      .update(resumeFormatSettings)
      .set(updateData)
      .where(eq(resumeFormatSettings.resumeId, resumeId))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Seed default format settings for a resume.
   * Uses ON CONFLICT DO NOTHING to handle race conditions.
   */
  async seedDefaults(
    resumeId: string,
    defaults: { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }
  ): Promise<ResumeFormatSettingsRow> {
    const result = await db
      .insert(resumeFormatSettings)
      .values({
        resumeId,
        ats: defaults.ats,
        human: defaults.human
      })
      .onConflictDoNothing({ target: resumeFormatSettings.resumeId })
      .returning();

    // If conflict (already exists), fetch existing
    if (result.length === 0) {
      const existing = await this.findByResumeId(resumeId);
      return existing!;
    }

    return result[0]!;
  },

  /**
   * Duplicate format settings from one resume to another.
   * Reads source settings and creates a new row for the target resume.
   */
  async duplicateFrom(
    sourceResumeId: string,
    targetResumeId: string
  ): Promise<ResumeFormatSettingsRow | null> {
    const source = await this.findByResumeId(sourceResumeId);
    if (!source) return null;

    return await this.create(targetResumeId, {
      ats: source.ats,
      human: source.human
    });
  }
};
