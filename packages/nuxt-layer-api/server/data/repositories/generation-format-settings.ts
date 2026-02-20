import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import type { GenerationFormatSettingsRow } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { generationFormatSettings } from '../schema';

/**
 * Generation Format Settings Repository
 *
 * Data access layer for generation_format_settings table.
 * Stores per-generation settings snapshots for vacancy resume editing.
 */
export const generationFormatSettingsRepository = {
  /**
   * Find format settings by generation ID.
   */
  async findByGenerationId(generationId: string): Promise<GenerationFormatSettingsRow | null> {
    const result = await db
      .select()
      .from(generationFormatSettings)
      .where(eq(generationFormatSettings.generationId, generationId))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Create format settings for a generation.
   */
  async create(
    generationId: string,
    settings: { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman }
  ): Promise<GenerationFormatSettingsRow> {
    const result = await db
      .insert(generationFormatSettings)
      .values({
        generationId,
        ats: settings.ats,
        human: settings.human
      })
      .onConflictDoNothing({ target: generationFormatSettings.generationId })
      .returning();

    if (result.length === 0) {
      const existing = await this.findByGenerationId(generationId);
      return existing!;
    }

    return result[0]!;
  },

  /**
   * Update format settings for a generation (partial — ats and/or human).
   */
  async update(
    generationId: string,
    settings: { ats?: ResumeFormatSettingsAts; human?: ResumeFormatSettingsHuman }
  ): Promise<GenerationFormatSettingsRow | null> {
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
      .update(generationFormatSettings)
      .set(updateData)
      .where(eq(generationFormatSettings.generationId, generationId))
      .returning();

    return result[0] ?? null;
  }
};
