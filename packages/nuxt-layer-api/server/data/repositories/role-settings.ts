import type { Role, RoleSettingsInput } from '@int/schema';
import type { RoleSettings } from '../schema';
import { USER_ROLE_MAP } from '@int/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roleSettings } from '../schema';

const normalizeRoleSettingsRow = (row: RoleSettings): RoleSettingsInput & { updatedAt: Date } => {
  return {
    role: row.role,
    platformLlmEnabled: row.platformLlmEnabled,
    dailyBudgetCap: Number(row.dailyBudgetCap),
    weeklyBudgetCap: Number(row.weeklyBudgetCap),
    monthlyBudgetCap: Number(row.monthlyBudgetCap),
    updatedAt: row.updatedAt
  };
};

const buildUpsertValues = (
  input: RoleSettingsInput,
  updatedAt: Date
): {
  role: Role;
  platformLlmEnabled: boolean;
  dailyBudgetCap: string;
  weeklyBudgetCap: string;
  monthlyBudgetCap: string;
  updatedAt: Date;
} => {
  return {
    role: input.role,
    platformLlmEnabled: input.platformLlmEnabled,
    dailyBudgetCap: input.dailyBudgetCap.toString(),
    weeklyBudgetCap: input.weeklyBudgetCap.toString(),
    monthlyBudgetCap: input.monthlyBudgetCap.toString(),
    updatedAt
  };
};

function getDefaults(role: Role): RoleSettingsInput & { updatedAt: Date } {
  const base = {
    role,
    platformLlmEnabled: false,
    dailyBudgetCap: 0,
    weeklyBudgetCap: 0,
    monthlyBudgetCap: 0,
    updatedAt: new Date()
  };

  if (role === USER_ROLE_MAP.SUPER_ADMIN) {
    return {
      ...base,
      platformLlmEnabled: true
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
