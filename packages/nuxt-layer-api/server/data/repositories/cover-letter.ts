import type {
  CoverLetterLanguage,
  CoverLetterLengthPreset,
  CoverLetterTone,
  CoverLetterType,
  SpacingSettings
} from '@int/schema';
import type { CoverLetter } from '../schema';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { coverLetters, vacancies } from '../schema';

type UpsertCoverLetterPayload = {
  vacancyId: string;
  generationId: string;
  language: CoverLetterLanguage;
  type: CoverLetterType;
  tone: CoverLetterTone;
  lengthPreset: CoverLetterLengthPreset;
  recipientName: string | null;
  includeSubjectLine: boolean;
  instructions: string | null;
  subjectLine: string | null;
  contentMarkdown: string;
  formatSettings: SpacingSettings;
};

type UpdateCoverLetterPayload = Partial<Omit<UpsertCoverLetterPayload, 'vacancyId'>>;

/**
 * Cover Letter Repository
 *
 * Data access layer for cover_letters table.
 */
export const coverLetterRepository = {
  /**
   * Find cover letter by ID.
   */
  async findById(id: string): Promise<CoverLetter | null> {
    const result = await db.select().from(coverLetters).where(eq(coverLetters.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find cover letter by ID with ownership check.
   */
  async findByIdAndUserId(id: string, userId: string): Promise<CoverLetter | null> {
    const result = await db
      .select({
        id: coverLetters.id,
        vacancyId: coverLetters.vacancyId,
        generationId: coverLetters.generationId,
        language: coverLetters.language,
        type: coverLetters.type,
        tone: coverLetters.tone,
        lengthPreset: coverLetters.lengthPreset,
        recipientName: coverLetters.recipientName,
        includeSubjectLine: coverLetters.includeSubjectLine,
        instructions: coverLetters.instructions,
        subjectLine: coverLetters.subjectLine,
        contentMarkdown: coverLetters.contentMarkdown,
        formatSettings: coverLetters.formatSettings,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt
      })
      .from(coverLetters)
      .innerJoin(vacancies, eq(coverLetters.vacancyId, vacancies.id))
      .where(and(eq(coverLetters.id, id), eq(vacancies.userId, userId)))
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Find latest cover letter for a vacancy.
   */
  async findLatestByVacancyId(vacancyId: string): Promise<CoverLetter | null> {
    const result = await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.vacancyId, vacancyId))
      .orderBy(desc(coverLetters.updatedAt))
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Upsert latest cover letter by vacancy.
   * Stores one latest record per vacancy.
   */
  async upsertLatest(payload: UpsertCoverLetterPayload): Promise<CoverLetter> {
    const result = await db
      .insert(coverLetters)
      .values({
        vacancyId: payload.vacancyId,
        generationId: payload.generationId,
        language: payload.language,
        type: payload.type,
        tone: payload.tone,
        lengthPreset: payload.lengthPreset,
        recipientName: payload.recipientName,
        includeSubjectLine: payload.includeSubjectLine,
        instructions: payload.instructions,
        subjectLine: payload.subjectLine,
        contentMarkdown: payload.contentMarkdown,
        formatSettings: payload.formatSettings
      })
      .onConflictDoUpdate({
        target: coverLetters.vacancyId,
        set: {
          generationId: payload.generationId,
          language: payload.language,
          type: payload.type,
          tone: payload.tone,
          lengthPreset: payload.lengthPreset,
          recipientName: payload.recipientName,
          includeSubjectLine: payload.includeSubjectLine,
          instructions: payload.instructions,
          subjectLine: payload.subjectLine,
          contentMarkdown: payload.contentMarkdown,
          formatSettings: payload.formatSettings,
          updatedAt: new Date()
        }
      })
      .returning();

    const upserted = result[0];
    if (!upserted) {
      throw new Error('Failed to upsert cover letter');
    }

    return upserted;
  },

  /**
   * Update cover letter by ID.
   */
  async updateById(id: string, patch: UpdateCoverLetterPayload): Promise<CoverLetter | null> {
    const result = await db
      .update(coverLetters)
      .set({
        ...patch,
        updatedAt: new Date()
      })
      .where(eq(coverLetters.id, id))
      .returning();

    return result[0] ?? null;
  }
};
