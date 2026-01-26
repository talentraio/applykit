<template>
  <div class="admin-system-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.system.title')" />

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <SystemControls
        :config="config"
        :loading="configLoading"
        :saving="saving"
        :error="configError"
        @update="handleConfigUpdate"
      />

      <SystemBudgetDisplay
        :config="config"
        :loading="configLoading"
        :saving="saving"
        :error="configError"
        @update="handleBudgetUpdate"
      />
    </div>

    <div class="mt-6">
      <SystemUsageStats
        v-model:period="usagePeriod"
        :stats="usage"
        :loading="usageLoading"
        :error="usageError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin System Page
 *
 * Manage system configuration and usage stats.
 *
 * Related: T151 (US9)
 */

import type { PlatformProvider } from '@int/schema';
import SystemBudgetDisplay from '../../layers/system/app/components/BudgetDisplay.vue';
import SystemControls from '../../layers/system/app/components/SystemControls.vue';
import SystemUsageStats from '../../layers/system/app/components/UsageStats.vue';

defineOptions({ name: 'AdminSystemPage' });

const {
  config,
  usage,
  configLoading,
  usageLoading,
  saving,
  configError,
  usageError,
  fetchConfig,
  updateConfig,
  fetchUsageStats
} = useAdminSystem();

const { t } = useI18n();
const toast = useToast();

const usagePeriod = ref<'day' | 'week' | 'month'>('day');

const loadSystem = async () => {
  await Promise.all([fetchConfig(), fetchUsageStats(usagePeriod.value)]);
};

await callOnce('admin-system', async () => {
  await loadSystem();
});

watch(usagePeriod, async period => {
  try {
    await fetchUsageStats(period);
  } catch {
    // Error is already exposed via store state
  }
});

const handleConfigUpdate = async (payload: {
  platformLlmEnabled?: boolean;
  byokEnabled?: boolean;
  platformProvider?: PlatformProvider;
  globalBudgetCap?: number;
}) => {
  try {
    await updateConfig(payload);
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
  }
};

const handleBudgetUpdate = async (cap: number) => {
  await handleConfigUpdate({ globalBudgetCap: cap });
};
</script>

<style lang="scss">
.admin-system-page {
  // Reserved for page-specific styling
}
</style>
