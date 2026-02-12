import type {
  GenerationScoreDetail,
  GenerationScoreDetailPayload,
  LLMProvider,
  LlmStrategyKey
} from '@int/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { generationScoreDetails } from '../schema';

type GenerationScoreDetailRow = typeof generationScoreDetails.$inferSelect;

const toEntity = (row: GenerationScoreDetailRow): GenerationScoreDetail => {
  return {
    id: row.id,
    generationId: row.generationId,
    vacancyId: row.vacancyId,
    vacancyVersionMarker: row.vacancyVersionMarker,
    details: row.details,
    provider: row.provider,
    model: row.model,
    strategyKey: row.strategyKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export const generationScoreDetailRepository = {
  async findByGenerationId(generationId: string): Promise<GenerationScoreDetail | null> {
    const [row] = await db
      .select()
      .from(generationScoreDetails)
      .where(eq(generationScoreDetails.generationId, generationId))
      .limit(1);

    return row ? toEntity(row) : null;
  },

  async findByVacancyAndGeneration(
    vacancyId: string,
    generationId: string
  ): Promise<GenerationScoreDetail | null> {
    const [row] = await db
      .select()
      .from(generationScoreDetails)
      .where(
        and(
          eq(generationScoreDetails.vacancyId, vacancyId),
          eq(generationScoreDetails.generationId, generationId)
        )
      )
      .limit(1);

    return row ? toEntity(row) : null;
  },

  async upsertByGeneration(input: {
    generationId: string;
    vacancyId: string;
    vacancyVersionMarker: string;
    details: GenerationScoreDetailPayload;
    provider: LLMProvider;
    model: string;
    strategyKey: LlmStrategyKey | null;
  }): Promise<GenerationScoreDetail> {
    const now = new Date();
    const values = {
      generationId: input.generationId,
      vacancyId: input.vacancyId,
      vacancyVersionMarker: input.vacancyVersionMarker,
      details: input.details,
      provider: input.provider,
      model: input.model,
      strategyKey: input.strategyKey,
      updatedAt: now
    };

    const [row] = await db
      .insert(generationScoreDetails)
      .values({
        ...values,
        createdAt: now
      })
      .onConflictDoUpdate({
        target: generationScoreDetails.generationId,
        set: values
      })
      .returning();

    if (!row) {
      throw new Error('Failed to upsert generation score details');
    }

    return toEntity(row);
  }
};
