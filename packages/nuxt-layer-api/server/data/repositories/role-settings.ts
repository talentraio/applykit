import type { Role, RoleSettingsInput } from '@int/schema';
import process from 'node:process';
import { PLATFORM_PROVIDER_VALUES, USER_ROLE_MAP } from '@int/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { roleSettings } from '../schema';

const defaultPlatformProvider = PLATFORM_PROVIDER_VALUES[0];

type RoleSettingsRow = {
  role: Role;
  platformLlmEnabled: boolean | number | string;
  byokEnabled: boolean | number | string;
  platformProvider: RoleSettingsInput['platformProvider'];
  dailyBudgetCap: string | number;
  updatedAt: Date;
};

const normalizeBoolean = (value: unknown): boolean => {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Boolean(value);
};

const normalizeRoleSettingsRow = (
  row: RoleSettingsRow
): RoleSettingsInput & { updatedAt: Date } => {
  return {
    role: row.role,
    platformLlmEnabled: normalizeBoolean(row.platformLlmEnabled),
    byokEnabled: normalizeBoolean(row.byokEnabled),
    platformProvider: row.platformProvider,
    dailyBudgetCap: Number(row.dailyBudgetCap),
    updatedAt: row.updatedAt
  };
};

const isSqliteRuntime = (): boolean => {
  const runtimeConfig = useRuntimeConfig();
  return process.env.NODE_ENV !== 'production' && !runtimeConfig.databaseUrl;
};

const buildUpsertValues = (
  input: RoleSettingsInput,
  updatedAt: Date
): {
  role: Role;
  platformLlmEnabled: boolean | ReturnType<typeof sql>;
  byokEnabled: boolean | ReturnType<typeof sql>;
  platformProvider: RoleSettingsInput['platformProvider'];
  dailyBudgetCap: string;
  updatedAt: Date;
} => {
  if (!isSqliteRuntime()) {
    return {
      role: input.role,
      platformLlmEnabled: input.platformLlmEnabled,
      byokEnabled: input.byokEnabled,
      platformProvider: input.platformProvider,
      dailyBudgetCap: input.dailyBudgetCap.toString(),
      updatedAt
    };
  }

  return {
    role: input.role,
    platformLlmEnabled: sql`${input.platformLlmEnabled ? 1 : 0}`,
    byokEnabled: sql`${input.byokEnabled ? 1 : 0}`,
    platformProvider: input.platformProvider,
    dailyBudgetCap: input.dailyBudgetCap.toString(),
    updatedAt
  };
};

function getDefaults(role: Role): RoleSettingsInput & { updatedAt: Date } {
  const base = {
    role,
    platformLlmEnabled: false,
    byokEnabled: false,
    platformProvider: defaultPlatformProvider,
    dailyBudgetCap: 0,
    updatedAt: new Date()
  };

  if (role === USER_ROLE_MAP.SUPER_ADMIN) {
    return {
      ...base,
      platformLlmEnabled: true,
      byokEnabled: true
    };
  }

  return base;
}

export const roleSettingsRepository = {
  /**
   * Get role settings (falls back to defaults)
   */
  async getByRole(role: Role): Promise<RoleSettingsInput & { updatedAt: Date }> {
    const result = await db.select().from(roleSettings).where(eq(roleSettings.role, role)).limit(1);

    const row = result[0];

    if (!row) {
      return getDefaults(role);
    }

    return normalizeRoleSettingsRow(row);
  },

  /**
   * Upsert role settings
   */
  async upsert(input: RoleSettingsInput): Promise<RoleSettingsInput & { updatedAt: Date }> {
    const updatedAt = new Date();
    const values = buildUpsertValues(input, updatedAt);

    const result = await db
      .insert(roleSettings)
      .values(values)
      .onConflictDoUpdate({
        target: roleSettings.role,
        set: {
          ...values
        }
      })
      .returning();

    const row = result[0];

    if (!row) {
      return await roleSettingsRepository.getByRole(input.role);
    }

    return normalizeRoleSettingsRow(row);
  }
};
