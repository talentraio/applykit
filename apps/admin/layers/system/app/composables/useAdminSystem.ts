/**
 * Admin System Composable
 *
 * Thin proxy over admin system store for convenient access in components.
 * Does NOT hold state - all state lives in useAdminSystemStore.
 *
 * Related: T146 (US9)
 */

import type {
  AdminSystemConfig,
  AdminSystemConfigInput,
  AdminUsageStats,
  UsagePeriod
} from '../infrastructure/admin-system.api';
import { useAdminSystemStore } from '../stores/admin-system';

export type UseAdminSystemReturn = {
  /**
   * System configuration
   */
  config: ComputedRef<AdminSystemConfig | null>;

  /**
   * Usage statistics
   */
  usage: ComputedRef<AdminUsageStats | null>;

  /**
   * Config loading state
   */
  configLoading: ComputedRef<boolean>;

  /**
   * Usage loading state
   */
  usageLoading: ComputedRef<boolean>;

  /**
   * Config update state
   */
  saving: ComputedRef<boolean>;

  /**
   * Config error state
   */
  configError: ComputedRef<Error | null>;

  /**
   * Usage error state
   */
  usageError: ComputedRef<Error | null>;

  /**
   * Whether config has been loaded
   */
  hasConfig: ComputedRef<boolean>;

  /**
   * Whether usage stats have been loaded
   */
  hasUsage: ComputedRef<boolean>;

  /**
   * Fetch system configuration
   */
  fetchConfig: () => Promise<AdminSystemConfig>;

  /**
   * Update system configuration
   */
  updateConfig: (input: AdminSystemConfigInput) => Promise<AdminSystemConfig>;

  /**
   * Fetch usage stats for a period
   */
  fetchUsageStats: (period?: UsagePeriod) => Promise<AdminUsageStats>;
};

export function useAdminSystem(): UseAdminSystemReturn {
  const store = useAdminSystemStore();

  return {
    config: computed(() => store.config),
    usage: computed(() => store.usage),
    configLoading: computed(() => store.configLoading),
    usageLoading: computed(() => store.usageLoading),
    saving: computed(() => store.saving),
    configError: computed(() => store.configError),
    usageError: computed(() => store.usageError),
    hasConfig: computed(() => store.hasConfig),
    hasUsage: computed(() => store.hasUsage),
    fetchConfig: () => store.fetchConfig(),
    updateConfig: (input: AdminSystemConfigInput) => store.updateConfig(input),
    fetchUsageStats: (period?: UsagePeriod) => store.fetchUsageStats(period)
  };
}
