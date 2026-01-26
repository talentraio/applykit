import type { PlatformProvider, SystemConfigKey } from '@int/schema';
import { SystemConfigDefaults, SystemConfigKeySchema, SystemConfigValues } from '@int/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { systemConfigs } from '../schema';

/**
 * System Config Repository
 *
 * Data access layer for system_configs table
 * Type-safe key-value store for system-wide configuration
 */
export const systemConfigRepository = {
  /**
   * Get configuration value by key
   * Returns typed value based on key
   */
  async get<K extends SystemConfigKey>(key: K): Promise<unknown> {
    const result = await db.select().from(systemConfigs).where(eq(systemConfigs.key, key)).limit(1);

    if (!result[0]) {
      // Return default value if not found
      return SystemConfigDefaults[key];
    }

    // Parse JSONB value
    const parsed = parseStoredValue(result[0].value, key);
    if (parsed.shouldPersist) {
      await this.set(key, parsed.value);
    }

    return parsed.value;
  },

  /**
   * Get boolean config value
   */
  async getBoolean(
    key: Extract<SystemConfigKey, 'platform_llm_enabled' | 'byok_enabled'>
  ): Promise<boolean> {
    const value = await this.get(key);
    return Boolean(value);
  },

  /**
   * Get number config value
   */
  async getNumber(
    key: Extract<SystemConfigKey, 'global_budget_cap' | 'global_budget_used'>
  ): Promise<number> {
    const value = await this.get(key);
    return Number(value);
  },

  /**
   * Get platform provider
   */
  async getPlatformProvider(): Promise<PlatformProvider> {
    const value = await this.get('platform_provider');
    return value as PlatformProvider;
  },

  /**
   * Set configuration value
   * Type-safe based on key
   */
  async set<K extends SystemConfigKey>(key: K, value: unknown): Promise<void> {
    // Validate value against schema for this key
    const schema = SystemConfigValues[key];
    schema.parse(value);

    const jsonValue = JSON.stringify(value);

    await db
      .insert(systemConfigs)
      .values({ key, value: jsonValue })
      .onConflictDoUpdate({
        target: systemConfigs.key,
        set: {
          value: jsonValue,
          updatedAt: new Date()
        }
      });
  },

  /**
   * Set boolean config value
   */
  async setBoolean(
    key: Extract<SystemConfigKey, 'platform_llm_enabled' | 'byok_enabled'>,
    value: boolean
  ): Promise<void> {
    await this.set(key, value);
  },

  /**
   * Set number config value
   */
  async setNumber(
    key: Extract<SystemConfigKey, 'global_budget_cap' | 'global_budget_used'>,
    value: number
  ): Promise<void> {
    await this.set(key, value);
  },

  /**
   * Set platform provider
   */
  async setPlatformProvider(provider: PlatformProvider): Promise<void> {
    await this.set('platform_provider', provider);
  },

  /**
   * Get all configuration
   * Returns complete config object
   */
  async getAll(): Promise<Record<SystemConfigKey, unknown>> {
    const results = await db.select().from(systemConfigs);

    const config: Record<string, unknown> = { ...SystemConfigDefaults };

    for (const row of results) {
      const parsedKey = SystemConfigKeySchema.safeParse(row.key);
      if (!parsedKey.success) {
        console.warn(`Unknown system config key "${row.key}". Skipping.`);
        continue;
      }

      const parsed = parseStoredValue(row.value, parsedKey.data);
      config[parsedKey.data] = parsed.value;

      if (parsed.shouldPersist) {
        await this.set(parsedKey.data, parsed.value);
      }
    }

    return config as Record<SystemConfigKey, unknown>;
  },

  /**
   * Reset to defaults
   * Admin function to reset all config to default values
   */
  async resetToDefaults(): Promise<void> {
    await db.delete(systemConfigs);

    // Re-insert defaults
    const entries = Object.entries(SystemConfigDefaults) as [SystemConfigKey, unknown][];
    for (const [key, value] of entries) {
      await this.set(key, value);
    }
  },

  /**
   * Increment global budget used
   * Called after platform LLM operations
   */
  async incrementBudgetUsed(amount: number): Promise<number> {
    const current = await this.getNumber('global_budget_used');
    const newValue = current + amount;
    await this.setNumber('global_budget_used', newValue);
    return newValue;
  },

  /**
   * Check if platform LLM is enabled and under budget
   * Used before allowing platform LLM operations
   */
  async canUsePlatformLLM(): Promise<{ allowed: boolean; reason?: string }> {
    const enabled = await this.getBoolean('platform_llm_enabled');
    if (!enabled) {
      return { allowed: false, reason: 'Platform LLM is disabled' };
    }

    const budgetCap = await this.getNumber('global_budget_cap');
    const budgetUsed = await this.getNumber('global_budget_used');

    if (budgetUsed >= budgetCap) {
      return { allowed: false, reason: 'Global budget cap reached' };
    }

    return { allowed: true };
  },

  /**
   * Check if BYOK is enabled
   */
  async isBYOKEnabled(): Promise<boolean> {
    return await this.getBoolean('byok_enabled');
  }
};

type ParsedStoredValue = {
  value: unknown;
  shouldPersist: boolean;
};

function parseStoredValue(value: unknown, key: SystemConfigKey): ParsedStoredValue {
  if (typeof value !== 'string') {
    return { value, shouldPersist: false };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value, shouldPersist: false };
  }

  try {
    return { value: JSON.parse(trimmed), shouldPersist: false };
  } catch (error) {
    const coerced = coerceLegacyValue(trimmed, key);
    if (coerced !== null) {
      const schema = SystemConfigValues[key];
      if (schema.safeParse(coerced).success) {
        return { value: coerced, shouldPersist: true };
      }
    }

    console.warn(`Invalid JSON in system_configs for key "${key}". Using raw value.`, error);
    return { value: trimmed, shouldPersist: false };
  }
}

function coerceLegacyValue(value: string, key: SystemConfigKey): unknown | null {
  switch (key) {
    case 'platform_provider':
      return value;
    case 'platform_llm_enabled':
    case 'byok_enabled': {
      const lower = value.toLowerCase();
      if (lower === 'true' || value === '1') {
        return true;
      }
      if (lower === 'false' || value === '0') {
        return false;
      }
      return null;
    }
    case 'global_budget_cap':
    case 'global_budget_used': {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    }
    default:
      return null;
  }
}
