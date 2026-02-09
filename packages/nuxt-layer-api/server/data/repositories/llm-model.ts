import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput, LLMProvider } from '@int/schema';
import type { LlmModel as LlmModelRow } from '../schema';
import { and, eq, ne, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { llmModels, llmRoleScenarioOverrides, llmScenarioModels } from '../schema';

const mapRowToModel = (row: LlmModelRow): LlmModel => {
  return {
    id: row.id,
    provider: row.provider,
    modelKey: row.modelKey,
    displayName: row.displayName,
    status: row.status,
    inputPricePer1mUsd: Number(row.inputPricePer1mUsd),
    outputPricePer1mUsd: Number(row.outputPricePer1mUsd),
    cachedInputPricePer1mUsd:
      row.cachedInputPricePer1mUsd === null ? null : Number(row.cachedInputPricePer1mUsd),
    maxContextTokens: row.maxContextTokens,
    maxOutputTokens: row.maxOutputTokens,
    supportsJson: row.supportsJson,
    supportsTools: row.supportsTools,
    supportsStreaming: row.supportsStreaming,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export type DeleteModelResult = 'deleted' | 'referenced' | 'not_found';

export const llmModelRepository = {
  async findAll(): Promise<LlmModel[]> {
    const rows = await db
      .select()
      .from(llmModels)
      .orderBy(
        sql`CASE ${llmModels.status}
          WHEN 'active' THEN 0
          WHEN 'disabled' THEN 1
          ELSE 2
        END`,
        llmModels.provider,
        llmModels.displayName
      );

    return rows.map(mapRowToModel);
  },

  async findActive(): Promise<LlmModel[]> {
    const rows = await db
      .select()
      .from(llmModels)
      .where(eq(llmModels.status, 'active'))
      .orderBy(llmModels.provider, llmModels.displayName);

    return rows.map(mapRowToModel);
  },

  async findById(id: string): Promise<LlmModel | null> {
    const rows = await db.select().from(llmModels).where(eq(llmModels.id, id)).limit(1);
    return rows[0] ? mapRowToModel(rows[0]) : null;
  },

  async hasProviderModelKey(
    provider: LLMProvider,
    modelKey: string,
    excludeId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(llmModels.provider, provider),
      eq(llmModels.modelKey, modelKey),
      or(eq(llmModels.status, 'active'), eq(llmModels.status, 'disabled'))
    ];

    if (excludeId) {
      conditions.push(ne(llmModels.id, excludeId));
    }

    const rows = await db
      .select({ id: llmModels.id })
      .from(llmModels)
      .where(and(...conditions))
      .limit(1);

    return rows.length > 0;
  },

  async create(input: LlmModelCreateInput): Promise<LlmModel> {
    const [row] = await db
      .insert(llmModels)
      .values({
        provider: input.provider,
        modelKey: input.modelKey,
        displayName: input.displayName,
        status: input.status,
        inputPricePer1mUsd: input.inputPricePer1mUsd.toString(),
        outputPricePer1mUsd: input.outputPricePer1mUsd.toString(),
        cachedInputPricePer1mUsd:
          input.cachedInputPricePer1mUsd === undefined
            ? null
            : input.cachedInputPricePer1mUsd === null
              ? null
              : input.cachedInputPricePer1mUsd.toString(),
        maxContextTokens: input.maxContextTokens ?? null,
        maxOutputTokens: input.maxOutputTokens ?? null,
        supportsJson: input.supportsJson,
        supportsTools: input.supportsTools,
        supportsStreaming: input.supportsStreaming,
        notes: input.notes ?? null
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create LLM model');
    }

    return mapRowToModel(row);
  },

  async update(id: string, input: LlmModelUpdateInput): Promise<LlmModel | null> {
    const patch: Partial<typeof llmModels.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.status !== undefined) patch.status = input.status;
    if (input.inputPricePer1mUsd !== undefined) {
      patch.inputPricePer1mUsd = input.inputPricePer1mUsd.toString();
    }
    if (input.outputPricePer1mUsd !== undefined) {
      patch.outputPricePer1mUsd = input.outputPricePer1mUsd.toString();
    }
    if (input.cachedInputPricePer1mUsd !== undefined) {
      patch.cachedInputPricePer1mUsd =
        input.cachedInputPricePer1mUsd === null ? null : input.cachedInputPricePer1mUsd.toString();
    }
    if (input.maxContextTokens !== undefined) patch.maxContextTokens = input.maxContextTokens;
    if (input.maxOutputTokens !== undefined) patch.maxOutputTokens = input.maxOutputTokens;
    if (input.supportsJson !== undefined) patch.supportsJson = input.supportsJson;
    if (input.supportsTools !== undefined) patch.supportsTools = input.supportsTools;
    if (input.supportsStreaming !== undefined) patch.supportsStreaming = input.supportsStreaming;
    if (input.notes !== undefined) patch.notes = input.notes;

    const [row] = await db.update(llmModels).set(patch).where(eq(llmModels.id, id)).returning();
    return row ? mapRowToModel(row) : null;
  },

  async isReferenced(modelId: string): Promise<boolean> {
    const [defaultRef, roleOverrideRef] = await Promise.all([
      db
        .select({ modelId: llmScenarioModels.modelId })
        .from(llmScenarioModels)
        .where(eq(llmScenarioModels.modelId, modelId))
        .limit(1),
      db
        .select({ modelId: llmRoleScenarioOverrides.modelId })
        .from(llmRoleScenarioOverrides)
        .where(eq(llmRoleScenarioOverrides.modelId, modelId))
        .limit(1)
    ]);

    return defaultRef.length > 0 || roleOverrideRef.length > 0;
  },

  async delete(id: string): Promise<DeleteModelResult> {
    const existing = await this.findById(id);
    if (!existing) {
      return 'not_found';
    }

    if (await this.isReferenced(id)) {
      return 'referenced';
    }

    await db.delete(llmModels).where(eq(llmModels.id, id));
    return 'deleted';
  }
};
