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
import {
  LLM_REASONING_EFFORT_MAP,
  LLM_RESPONSE_FORMAT_MAP,
  LLM_SCENARIO_KEY_MAP
} from '@int/schema';
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
const SCENARIO_KEY_ENUM_NAME = 'llm_scenario_key';

type ScenarioBootstrapConfig = {
  label: string;
  description: string;
  enabled: boolean;
  defaultModelKeys?: string[];
  defaultTemperature?: string | null;
  defaultMaxTokens?: number | null;
  defaultResponseFormat?: 'text' | 'json' | null;
  defaultReasoningEffort?: LlmReasoningEffort | null;
  defaultStrategyKey?: LlmStrategyKey | null;
};

const SCENARIO_BOOTSTRAP_CONFIG: Partial<Record<LlmScenarioKey, ScenarioBootstrapConfig>> = {
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT]: {
    label: 'Cover Letter Generation Draft',
    description: 'Generate a fast draft cover letter structure for manual refinement.',
    enabled: true,
    defaultModelKeys: ['gpt-5-mini', 'gpt-4.1-mini'],
    defaultTemperature: '0.40',
    defaultMaxTokens: 3000,
    defaultResponseFormat: LLM_RESPONSE_FORMAT_MAP.JSON,
    defaultReasoningEffort: LLM_REASONING_EFFORT_MAP.AUTO,
    defaultStrategyKey: null
  },
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC]: {
    label: 'Cover Letter Humanizer Critic',
    description: 'Evaluate and optionally rewrite cover letter output for naturalness.',
    enabled: false,
    defaultModelKeys: ['gpt-5-mini', 'gpt-4.1-mini'],
    defaultTemperature: '0.00',
    defaultMaxTokens: 1500,
    defaultResponseFormat: LLM_RESPONSE_FORMAT_MAP.JSON,
    defaultReasoningEffort: LLM_REASONING_EFFORT_MAP.LOW,
    defaultStrategyKey: null
  }
};

const BOOTSTRAP_SCENARIO_KEYS: LlmScenarioKey[] = [
  LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT,
  LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC
];

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

const isInvalidScenarioEnumValueError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('invalid input value for enum') &&
    error.message.includes(SCENARIO_KEY_ENUM_NAME)
  );
};

const ensureScenarioBootstrap = async (scenarioKey: LlmScenarioKey): Promise<void> => {
  const config = SCENARIO_BOOTSTRAP_CONFIG[scenarioKey];
  if (!config) {
    return;
  }

  try {
    await db
      .insert(llmScenarios)
      .values({
        key: scenarioKey,
        label: config.label,
        description: config.description,
        enabled: config.enabled
      })
      .onConflictDoNothing();
  } catch (error) {
    if (isInvalidScenarioEnumValueError(error)) {
      return;
    }
    throw error;
  }

  if (!config.defaultModelKeys?.length) {
    return;
  }

  const [existingDefault] = await db
    .select({ scenarioKey: llmScenarioModels.scenarioKey })
    .from(llmScenarioModels)
    .where(eq(llmScenarioModels.scenarioKey, scenarioKey))
    .limit(1);
  if (existingDefault) {
    return;
  }

  const modelRows = await db
    .select({ id: llmModels.id, modelKey: llmModels.modelKey })
    .from(llmModels)
    .where(and(eq(llmModels.provider, 'openai'), eq(llmModels.status, 'active')));

  const resolvedModelId =
    config.defaultModelKeys
      .map(modelKey => modelRows.find(row => row.modelKey === modelKey)?.id ?? null)
      .find(modelId => modelId !== null) ?? null;

  if (!resolvedModelId) {
    return;
  }

  await db
    .insert(llmScenarioModels)
    .values({
      scenarioKey,
      modelId: resolvedModelId,
      retryModelId: null,
      temperature: config.defaultTemperature ?? null,
      maxTokens: config.defaultMaxTokens ?? null,
      responseFormat: config.defaultResponseFormat ?? null,
      reasoningEffort: config.defaultReasoningEffort ?? null,
      strategyKey: config.defaultStrategyKey ?? null
    })
    .onConflictDoNothing();
};

const ensureBootstrapScenarios = async (): Promise<void> => {
  for (const scenarioKey of BOOTSTRAP_SCENARIO_KEYS) {
    await ensureScenarioBootstrap(scenarioKey);
  }
};

export type RuntimeResolvedModel = {
  source: 'role_override' | 'scenario_default';
  assignment: RoutingAssignment;
  model: LlmModel;
  retryModel: LlmModel | null;
};

export const llmRoutingRepository = {
  async findScenario(scenarioKey: LlmScenarioKey): Promise<LlmScenarioRow | null> {
    await ensureScenarioBootstrap(scenarioKey);

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
    await ensureBootstrapScenarios();

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
    await ensureScenarioBootstrap(scenarioKey);

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
    await ensureScenarioBootstrap(scenarioKey);

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
    await ensureScenarioBootstrap(scenarioKey);

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
    await ensureScenarioBootstrap(scenarioKey);

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
