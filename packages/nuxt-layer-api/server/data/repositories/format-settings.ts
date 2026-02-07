import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import type { UserFormatSettingsRow } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userFormatSettings } from '../schema';

/**
 * Format Settings Repository
 *
 * Data access layer for user_format_settings table
 * Handles per-user resume formatting preferences
 */
export const formatSettingsRepository = {
  /**
   * Find format settings by user ID
   */
  async findByUserId(userId: string): Promise<UserFormatSettingsRow | null> {
    const result = await db
      .select()
      .from(userFormatSettings)
      .where(eq(userFormatSettings.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Create format settings for a user
   */
  async create(
    userId: string,
    settings: { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }
  ): Promise<UserFormatSettingsRow> {
    const result = await db
      .insert(userFormatSettings)
      .values({
        userId,
        ats: settings.ats,
        human: settings.human
      })
      .returning();
    return result[0]!;
  },

  /**
   * Update format settings for a user (partial — ats and/or human)
   */
  async update(
    userId: string,
    settings: { ats?: ResumeFormatSettingsAts; human?: ResumeFormatSettingsHuman }
  ): Promise<UserFormatSettingsRow | null> {
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
      .update(userFormatSettings)
      .set(updateData)
      .where(eq(userFormatSettings.userId, userId))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Seed default format settings for a new user
   * Called during user creation (registration, OAuth)
   */
  async seedDefaults(
    userId: string,
    defaults: { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }
  ): Promise<UserFormatSettingsRow> {
    const result = await db
      .insert(userFormatSettings)
      .values({
        userId,
        ats: defaults.ats,
        human: defaults.human
      })
      .onConflictDoNothing({ target: userFormatSettings.userId })
      .returning();

    // If conflict (already exists), fetch existing
    if (result.length === 0) {
      const existing = await this.findByUserId(userId);
      return existing!;
    }

    return result[0]!;
  }
};
