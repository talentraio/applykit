import type {
  AdminSystemConfig,
  AdminSystemConfigInput,
  AdminUsageStats,
  UsagePeriod
} from '../infrastructure/admin-system.api';
import { adminSystemApi } from '../infrastructure/admin-system.api';

/**
 * Admin System Store
 *
 * Manages system configuration and usage stats for admins.
 */
export const useAdminSystemStore = defineStore('AdminSystemStore', {
  state: (): {
    config: AdminSystemConfig | null;
    usage: AdminUsageStats | null;
    configLoading: boolean;
    usageLoading: boolean;
    saving: boolean;
    configError: Error | null;
    usageError: Error | null;
  } => ({
    config: null,
    usage: null,
    configLoading: false,
    usageLoading: false,
    saving: false,
    configError: null,
    usageError: null
  }),

  getters: {
    hasConfig: state => Boolean(state.config),
    hasUsage: state => Boolean(state.usage)
  },

  actions: {
    /**
     * Fetch system configuration
     */
    async fetchConfig(): Promise<AdminSystemConfig> {
      this.configLoading = true;
      this.configError = null;

      try {
        const config = await adminSystemApi.fetchConfig();
        this.config = config;
        return config;
      } catch (err) {
        this.configError = err instanceof Error ? err : new Error('Failed to fetch system config');
        throw this.configError;
      } finally {
        this.configLoading = false;
      }
    },

    /**
     * Update system configuration
     */
    async updateConfig(input: AdminSystemConfigInput): Promise<AdminSystemConfig> {
      this.saving = true;
      this.configError = null;

      try {
        const config = await adminSystemApi.updateConfig(input);
        this.config = config;
        return config;
      } catch (err) {
        this.configError = err instanceof Error ? err : new Error('Failed to update system config');
        throw this.configError;
      } finally {
        this.saving = false;
      }
    },

    /**
     * Fetch system usage stats
     */
    async fetchUsageStats(period: UsagePeriod = 'day'): Promise<AdminUsageStats> {
      this.usageLoading = true;
      this.usageError = null;

      try {
        const usage = await adminSystemApi.fetchUsageStats(period);
        this.usage = usage;
        return usage;
      } catch (err) {
        this.usageError = err instanceof Error ? err : new Error('Failed to fetch usage stats');
        throw this.usageError;
      } finally {
        this.usageLoading = false;
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.config = null;
      this.usage = null;
      this.configLoading = false;
      this.usageLoading = false;
      this.saving = false;
      this.configError = null;
      this.usageError = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAdminSystemStore, import.meta.hot));
}
