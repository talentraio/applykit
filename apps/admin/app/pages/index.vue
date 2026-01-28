<template>
  <div class="admin-dashboard-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.nav.dashboard')">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton color="neutral" variant="soft" size="sm" @click="goTo('/system')">
            {{ $t('admin.nav.system') }}
          </UButton>
          <UButton color="neutral" variant="soft" size="sm" @click="goTo('/users')">
            {{ $t('admin.nav.users') }}
          </UButton>
        </div>
      </template>
    </UiPageHeader>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <UPageCard class="admin-dashboard-page__card">
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ $t('admin.system.budget') }}
          </h2>
        </template>

        <div v-if="configLoading && !config" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
        </div>

        <UAlert
          v-else-if="configError && !config"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="$t('common.error.generic')"
          :description="configError.message"
        />

        <div v-else class="space-y-4">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs text-muted">
              <span>{{ $t('admin.system.budgetUsage') }}</span>
              <span>{{ $t('admin.system.percent', { value: budgetPercent }) }}</span>
            </div>
            <UProgress :value="budgetPercent" color="primary" size="md" />
          </div>

          <div class="grid gap-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted">{{ $t('admin.system.budgetUsed') }}</span>
              <span class="font-medium">{{ formatCurrency(budgetUsed) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">{{ $t('admin.system.budgetCap') }}</span>
              <span class="font-medium">{{ formatCurrency(budgetCap) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted">{{ $t('admin.system.budgetRemaining') }}</span>
              <span class="font-medium">{{ formatCurrency(budgetRemaining) }}</span>
            </div>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="admin-dashboard-page__card">
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ $t('admin.system.usage.title') }}
          </h2>
        </template>

        <div v-if="usageLoading && !usage" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
        </div>

        <UAlert
          v-else-if="usageError && !usage"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="$t('common.error.generic')"
          :description="usageError.message"
        />

        <div v-else class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ $t('admin.system.usage.totalOperations') }}</span>
            <span class="font-medium">{{ usageStats.totalOperations }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ $t('admin.system.usage.totalCost') }}</span>
            <span class="font-medium">{{ formatCurrency(usageStats.totalCost) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted">{{ $t('admin.system.usage.uniqueUsers') }}</span>
            <span class="font-medium">{{ usageStats.uniqueUsers }}</span>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Dashboard Page
 *
 * High-level overview of system status and usage.
 *
 * Related: T152 (US9)
 */

defineOptions({ name: 'AdminDashboardPage' });

const {
  config,
  usage,
  configLoading,
  usageLoading,
  configError,
  usageError,
  fetchConfig,
  fetchUsageStats
} = useAdminSystem();

const { t } = useI18n();

const loadDashboard = async () => {
  await Promise.all([fetchConfig(), fetchUsageStats('day')]);
};

await callOnce('admin-dashboard', async () => {
  await loadDashboard();
});

const goTo = (path: string) => {
  navigateTo(path);
};

const budgetCap = computed(() => config.value?.globalBudgetCap ?? 0);
const budgetUsed = computed(() => config.value?.globalBudgetUsed ?? 0);
const budgetRemaining = computed(() => Math.max(0, budgetCap.value - budgetUsed.value));

const budgetPercent = computed(() => {
  if (budgetCap.value <= 0) return 0;
  const percent = (budgetUsed.value / budgetCap.value) * 100;
  return Math.min(100, Math.round(percent));
});

const usageStats = computed(() => ({
  totalOperations: usage.value?.totalOperations ?? 0,
  totalCost: usage.value?.totalCost ?? 0,
  uniqueUsers: usage.value?.uniqueUsers ?? 0
}));

const formatCurrency = (value: number) => t('admin.system.currency', { amount: value.toFixed(2) });
</script>

<style lang="scss">
.admin-dashboard-page {
  &__card {
    // Reserved for card-specific styling
  }
}
</style>
