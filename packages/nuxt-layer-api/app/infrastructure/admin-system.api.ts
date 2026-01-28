const adminSystemUrl = '/api/admin/system';
const adminUsageUrl = '/api/admin/usage';

export type AdminSystemConfig = {
  globalBudgetCap: number;
  globalBudgetUsed: number;
};

export type AdminSystemConfigInput = {
  globalBudgetCap?: number;
};

export type UsagePeriod = 'day' | 'week' | 'month';

export type AdminUsageStats = {
  period: UsagePeriod;
  totalOperations: number;
  byOperation: {
    parse: number;
    generate: number;
    export: number;
  };
  byProvider: {
    platform: number;
    byok: number;
  };
  totalCost: number;
  uniqueUsers: number;
};

/**
 * Admin System API
 *
 * Handles admin system configuration and usage endpoints.
 */
export const adminSystemApi = {
  /**
   * Fetch system configuration
   */
  async fetchConfig(): Promise<AdminSystemConfig> {
    return await useApi(adminSystemUrl, {
      method: 'GET'
    });
  },

  /**
   * Update system configuration
   */
  async updateConfig(data: AdminSystemConfigInput): Promise<AdminSystemConfig> {
    return await useApi(adminSystemUrl, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Fetch system usage stats
   */
  async fetchUsageStats(period: UsagePeriod = 'day'): Promise<AdminUsageStats> {
    return await useApi(adminUsageUrl, {
      method: 'GET',
      query: { period }
    });
  }
};
