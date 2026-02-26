import type {
  CoverLetterLanguage,
  CoverLetterLengthPreset,
  CoverLetterMarket,
  CoverLetterQualityMode,
  CoverLetterTone,
  CoverLetterType,
  GrammaticalGender,
  SpacingSettings
} from '@int/schema';
import type { CoverLetter } from '../schema';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { coverLetters, vacancies } from '../schema';

type CreateCoverLetterPayload = {
  vacancyId: string;
  generationId: string;
  language: CoverLetterLanguage;
  market: CoverLetterMarket;
  qualityMode: CoverLetterQualityMode;
  grammaticalGender: GrammaticalGender;
  type: CoverLetterType;
  tone: CoverLetterTone;
  lengthPreset: CoverLetterLengthPreset;
  characterLimit: number | null;
  recipientName: string | null;
  includeSubjectLine: boolean;
  instructions: string | null;
  subjectLine: string | null;
  contentMarkdown: string;
  formatSettings: SpacingSettings;
};

type UpdateCoverLetterPayload = Partial<Omit<CreateCoverLetterPayload, 'vacancyId'>>;

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
        market: coverLetters.market,
        qualityMode: coverLetters.qualityMode,
        grammaticalGender: coverLetters.grammaticalGender,
        type: coverLetters.type,
        tone: coverLetters.tone,
        lengthPreset: coverLetters.lengthPreset,
        characterLimit: coverLetters.characterLimit,
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
      .orderBy(desc(coverLetters.createdAt), desc(coverLetters.updatedAt))
      .limit(1);

    return result[0] ?? null;
  },

  /**
   * Create a new cover letter version.
   */
  async create(payload: CreateCoverLetterPayload): Promise<CoverLetter> {
    const result = await db
      .insert(coverLetters)
      .values({
        vacancyId: payload.vacancyId,
        generationId: payload.generationId,
        language: payload.language,
        market: payload.market,
        qualityMode: payload.qualityMode,
        grammaticalGender: payload.grammaticalGender,
        type: payload.type,
        tone: payload.tone,
        lengthPreset: payload.lengthPreset,
        characterLimit: payload.characterLimit,
        recipientName: payload.recipientName,
        includeSubjectLine: payload.includeSubjectLine,
        instructions: payload.instructions,
        subjectLine: payload.subjectLine,
        contentMarkdown: payload.contentMarkdown,
        formatSettings: payload.formatSettings
      })
      .returning();

    const created = result[0];
    if (!created) {
      throw new Error('Failed to create cover letter');
    }

    return created;
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
