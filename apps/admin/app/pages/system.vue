<template>
  <div class="admin-system-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.system.title')" />

    <div class="mt-6 grid gap-6">
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

import SystemBudgetDisplay from '../../layers/system/app/components/BudgetDisplay.vue';
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

const handleBudgetUpdate = async (cap: number) => {
  try {
    await updateConfig({ globalBudgetCap: cap });
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
  }
};
</script>

<style lang="scss">
.admin-system-page {
  // Reserved for page-specific styling
}
</style>
