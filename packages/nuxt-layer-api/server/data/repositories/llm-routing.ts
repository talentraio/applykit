import type {
  LlmModel,
  LlmReasoningEffort,
  LlmRoutingEnabledOverride,
  LlmRoutingItem,
  LlmRoutingOverride,
  LlmScenarioKey,
  LlmStrategyKey,
  Role,
  RoutingAssignmentInput
} from '@int/schema';
import type {
  LlmRoleScenarioEnabledOverride as LlmRoleScenarioEnabledOverrideRow,
  LlmRoleScenarioOverride as LlmRoleScenarioOverrideRow,
  LlmScenarioModel as LlmScenarioModelRow,
  LlmScenario as LlmScenarioRow
} from '../schema';
import { and, eq } from 'drizzle-orm';
import { isUndefinedTableError } from '../../utils/db-errors';
import { db } from '../db';
import {
  llmModels,
  llmRoleScenarioEnabledOverrides,
  llmRoleScenarioOverrides,
  llmScenarioModels,
  llmScenarios
} from '../schema';

const toNullableNumber = (value: string | null): number | null => {
  return value === null ? null : Number(value);
};

const ROLE_SCENARIO_ENABLED_OVERRIDES_RELATION = 'llm_role_scenario_enabled_overrides';

type RoutingAssignment = {
  modelId: string;
  retryModelId: string | null;
  temperature: number | null;
  maxTokens: number | null;
  responseFormat: 'text' | 'json' | null;
  reasoningEffort: LlmReasoningEffort | null;
  strategyKey: LlmStrategyKey | null;
  updatedAt: Date;
};

const toAssignment = (
  row: LlmScenarioModelRow | LlmRoleScenarioOverrideRow
): RoutingAssignment => ({
  modelId: row.modelId,
  retryModelId: row.retryModelId ?? null,
  temperature: toNullableNumber(row.temperature),
  maxTokens: row.maxTokens,
  responseFormat: row.responseFormat,
  reasoningEffort: row.reasoningEffort ?? null,
  strategyKey: row.strategyKey ?? null,
  updatedAt: row.updatedAt
});

const toEnabledOverride = (row: LlmRoleScenarioEnabledOverrideRow): LlmRoutingEnabledOverride => ({
  role: row.role,
  enabled: row.enabled,
  updatedAt: row.updatedAt
});

const toModel = (row: typeof llmModels.$inferSelect): LlmModel => {
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

const toDbPatch = (
  input: RoutingAssignmentInput
): Pick<
  typeof llmScenarioModels.$inferInsert,
  | 'modelId'
  | 'retryModelId'
  | 'temperature'
  | 'maxTokens'
  | 'responseFormat'
  | 'reasoningEffort'
  | 'strategyKey'
> => {
  return {
    modelId: input.modelId,
    retryModelId: input.retryModelId ?? null,
    temperature:
      input.temperature === undefined
        ? null
        : input.temperature === null
          ? null
          : input.temperature.toString(),
    maxTokens: input.maxTokens ?? null,
    responseFormat: input.responseFormat ?? null,
    reasoningEffort: input.reasoningEffort ?? null,
    strategyKey: input.strategyKey ?? null
  };
};

export type RuntimeResolvedModel = {
  source: 'role_override' | 'scenario_default';
  assignment: RoutingAssignment;
  model: LlmModel;
  retryModel: LlmModel | null;
};

export const llmRoutingRepository = {
  async findScenario(scenarioKey: LlmScenarioKey): Promise<LlmScenarioRow | null> {
    const rows = await db
      .select()
      .from(llmScenarios)
      .where(eq(llmScenarios.key, scenarioKey))
      .limit(1);

    return rows[0] ?? null;
  },

  async isModelActive(modelId: string): Promise<boolean> {
    const rows = await db
      .select({ id: llmModels.id })
      .from(llmModels)
      .where(and(eq(llmModels.id, modelId), eq(llmModels.status, 'active')))
      .limit(1);

    return rows.length > 0;
  },

  async findActiveModelById(modelId: string): Promise<LlmModel | null> {
    const [row] = await db
      .select()
      .from(llmModels)
      .where(and(eq(llmModels.id, modelId), eq(llmModels.status, 'active')))
      .limit(1);

    return row ? toModel(row) : null;
  },

  async getRoutingItems(): Promise<LlmRoutingItem[]> {
    const [scenarioRows, defaultRows, overrideRows] = await Promise.all([
      db.select().from(llmScenarios),
      db.select().from(llmScenarioModels),
      db.select().from(llmRoleScenarioOverrides)
    ]);

    const enabledOverrideRows = await (async (): Promise<LlmRoleScenarioEnabledOverrideRow[]> => {
      try {
        return await db.select().from(llmRoleScenarioEnabledOverrides);
      } catch (error) {
        if (isUndefinedTableError(error, ROLE_SCENARIO_ENABLED_OVERRIDES_RELATION)) {
          console.warn(
            `${ROLE_SCENARIO_ENABLED_OVERRIDES_RELATION} table is unavailable. Routing enabled overrides are disabled until migrations are applied.`
          );
          return [];
        }

        throw error;
      }
    })();

    const defaultByScenario = new Map(defaultRows.map(row => [row.scenarioKey, row]));
    const overridesByScenario = new Map<LlmScenarioKey, LlmRoutingOverride[]>();
    const enabledOverridesByScenario = new Map<LlmScenarioKey, LlmRoutingEnabledOverride[]>();

    overrideRows.forEach(row => {
      const scenarioKey = row.scenarioKey;
      const existing = overridesByScenario.get(scenarioKey) ?? [];
      existing.push({
        role: row.role,
        ...toAssignment(row)
      });
      overridesByScenario.set(scenarioKey, existing);
    });

    enabledOverrideRows.forEach(row => {
      const scenarioKey = row.scenarioKey;
      const existing = enabledOverridesByScenario.get(scenarioKey) ?? [];
      existing.push(toEnabledOverride(row));
      enabledOverridesByScenario.set(scenarioKey, existing);
    });

    return scenarioRows.map(row => {
      const defaultRow = defaultByScenario.get(row.key);

      return {
        scenarioKey: row.key,
        label: row.label,
        description: row.description,
        enabled: row.enabled,
        enabledOverrides: enabledOverridesByScenario.get(row.key) ?? [],
        default: defaultRow ? toAssignment(defaultRow) : null,
        overrides: overridesByScenario.get(row.key) ?? []
      };
    });
  },

  async getRoutingItem(scenarioKey: LlmScenarioKey): Promise<LlmRoutingItem | null> {
    const items = await this.getRoutingItems();
    return items.find(item => item.scenarioKey === scenarioKey) ?? null;
  },

  async upsertScenarioDefault(
    scenarioKey: LlmScenarioKey,
    input: RoutingAssignmentInput
  ): Promise<LlmRoutingItem | null> {
    const now = new Date();
    const values = {
      scenarioKey,
      ...toDbPatch(input),
      updatedAt: now
    };

    await db.insert(llmScenarioModels).values(values).onConflictDoUpdate({
      target: llmScenarioModels.scenarioKey,
      set: values
    });

    return await this.getRoutingItem(scenarioKey);
  },

  async updateScenarioEnabled(
    scenarioKey: LlmScenarioKey,
    enabled: boolean
  ): Promise<LlmRoutingItem | null> {
    const rows = await db
      .update(llmScenarios)
      .set({
        enabled,
        updatedAt: new Date()
      })
      .where(eq(llmScenarios.key, scenarioKey))
      .returning({ key: llmScenarios.key });

    if (rows.length === 0) {
      return null;
    }

    return await this.getRoutingItem(scenarioKey);
  },

  async upsertRoleOverride(
    scenarioKey: LlmScenarioKey,
    role: Role,
    input: RoutingAssignmentInput
  ): Promise<LlmRoutingItem | null> {
    const now = new Date();
    const values = {
      role,
      scenarioKey,
      ...toDbPatch(input),
      updatedAt: now
    };

    await db
      .insert(llmRoleScenarioOverrides)
      .values(values)
      .onConflictDoUpdate({
        target: [llmRoleScenarioOverrides.role, llmRoleScenarioOverrides.scenarioKey],
        set: values
      });

    return await this.getRoutingItem(scenarioKey);
  },

  async upsertRoleEnabledOverride(
    scenarioKey: LlmScenarioKey,
    role: Role,
    enabled: boolean
  ): Promise<LlmRoutingItem | null> {
    const now = new Date();

    await db
      .insert(llmRoleScenarioEnabledOverrides)
      .values({
        role,
        scenarioKey,
        enabled,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [llmRoleScenarioEnabledOverrides.role, llmRoleScenarioEnabledOverrides.scenarioKey],
        set: {
          enabled,
          updatedAt: now
        }
      });

    return await this.getRoutingItem(scenarioKey);
  },

  async deleteRoleOverride(scenarioKey: LlmScenarioKey, role: Role): Promise<boolean> {
    const rows = await db
      .delete(llmRoleScenarioOverrides)
      .where(
        and(
          eq(llmRoleScenarioOverrides.scenarioKey, scenarioKey),
          eq(llmRoleScenarioOverrides.role, role)
        )
      )
      .returning({ role: llmRoleScenarioOverrides.role });

    return rows.length > 0;
  },

  async deleteRoleEnabledOverride(scenarioKey: LlmScenarioKey, role: Role): Promise<boolean> {
    const rows = await db
      .delete(llmRoleScenarioEnabledOverrides)
      .where(
        and(
          eq(llmRoleScenarioEnabledOverrides.scenarioKey, scenarioKey),
          eq(llmRoleScenarioEnabledOverrides.role, role)
        )
      )
      .returning({ role: llmRoleScenarioEnabledOverrides.role });

    return rows.length > 0;
  },

  async resolveRuntimeModel(
    role: Role,
    scenarioKey: LlmScenarioKey
  ): Promise<RuntimeResolvedModel | null> {
    const scenario = await this.findScenario(scenarioKey);
    if (!scenario) {
      return null;
    }

    const [enabledOverride] = await (async (): Promise<LlmRoleScenarioEnabledOverrideRow[]> => {
      try {
        return await db
          .select()
          .from(llmRoleScenarioEnabledOverrides)
          .where(
            and(
              eq(llmRoleScenarioEnabledOverrides.scenarioKey, scenarioKey),
              eq(llmRoleScenarioEnabledOverrides.role, role)
            )
          )
          .limit(1);
      } catch (error) {
        if (isUndefinedTableError(error, ROLE_SCENARIO_ENABLED_OVERRIDES_RELATION)) {
          return [];
        }

        throw error;
      }
    })();

    const scenarioEnabled = enabledOverride?.enabled ?? scenario.enabled;
    if (!scenarioEnabled) {
      return null;
    }

    const [override] = await db
      .select()
      .from(llmRoleScenarioOverrides)
      .where(
        and(
          eq(llmRoleScenarioOverrides.scenarioKey, scenarioKey),
          eq(llmRoleScenarioOverrides.role, role)
        )
      )
      .limit(1);

    if (override) {
      const model = await this.findActiveModelById(override.modelId);
      if (model) {
        const retryModel = override.retryModelId
          ? await this.findActiveModelById(override.retryModelId)
          : null;

        return {
          source: 'role_override',
          assignment: toAssignment(override),
          model,
          retryModel
        };
      }
    }

    const [scenarioDefault] = await db
      .select()
      .from(llmScenarioModels)
      .where(eq(llmScenarioModels.scenarioKey, scenarioKey))
      .limit(1);

    if (!scenarioDefault) {
      return null;
    }

    const model = await this.findActiveModelById(scenarioDefault.modelId);
    if (!model) {
      return null;
    }

    const retryModel = scenarioDefault.retryModelId
      ? await this.findActiveModelById(scenarioDefault.retryModelId)
      : null;

    return {
      source: 'scenario_default',
      assignment: toAssignment(scenarioDefault),
      model,
      retryModel
    };
  }
};
