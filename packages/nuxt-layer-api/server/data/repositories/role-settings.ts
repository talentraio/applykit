import type { Role, RoleSettingsInput } from '@int/schema';
import type { RoleSettings } from '../schema';
import { PLATFORM_PROVIDER_VALUES, USER_ROLE_MAP } from '@int/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { roleSettings } from '../schema';

const defaultPlatformProvider = PLATFORM_PROVIDER_VALUES[0];

const normalizeRoleSettingsRow = (row: RoleSettings): RoleSettingsInput & { updatedAt: Date } => {
  return {
    role: row.role,
    platformLlmEnabled: row.platformLlmEnabled,
    platformProvider: row.platformProvider,
    dailyBudgetCap: Number(row.dailyBudgetCap),
    updatedAt: row.updatedAt
  };
};

const buildUpsertValues = (
  input: RoleSettingsInput,
  updatedAt: Date
): {
  role: Role;
  platformLlmEnabled: boolean;
  platformProvider: RoleSettingsInput['platformProvider'];
  dailyBudgetCap: string;
  updatedAt: Date;
} => {
  return {
    role: input.role,
    platformLlmEnabled: input.platformLlmEnabled,
    platformProvider: input.platformProvider,
    dailyBudgetCap: input.dailyBudgetCap.toString(),
    updatedAt
  };
};

function getDefaults(role: Role): RoleSettingsInput & { updatedAt: Date } {
  const base = {
    role,
    platformLlmEnabled: false,
    platformProvider: defaultPlatformProvider,
    dailyBudgetCap: 0,
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
