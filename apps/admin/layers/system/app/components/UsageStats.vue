<template>
  <UPageCard class="system-usage-stats">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">
            {{ $t('admin.system.usage.title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ $t('admin.system.usage.description') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UIcon
            v-if="loading && stats"
            name="i-lucide-loader-2"
            class="h-4 w-4 animate-spin text-muted"
          />
          <UFormField :label="$t('admin.system.usage.period')" class="min-w-[160px]">
            <USelectMenu
              v-model="periodModel"
              :items="periodOptions"
              value-key="value"
              size="sm"
              :disabled="loading"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <div v-if="isInitialLoading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="!stats && error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('common.error.generic')"
      :description="error.message"
    />

    <div v-else class="space-y-5">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="error.message"
      />
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.usage.totalOperations') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ displayStats.totalOperations }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.usage.totalCost') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatCurrency(displayStats.totalCost) }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.usage.uniqueUsers') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ displayStats.uniqueUsers }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2 rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.usage.byOperation') }}
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.system.usage.operations.parse') }}</span>
              <span class="font-medium">{{ displayStats.byOperation.parse }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.system.usage.operations.generate') }}</span>
              <span class="font-medium">{{ displayStats.byOperation.generate }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.system.usage.operations.export') }}</span>
              <span class="font-medium">{{ displayStats.byOperation.export }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.usage.byProvider') }}
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.system.usage.providers.platform') }}</span>
              <span class="font-medium">{{ displayStats.byProvider.platform }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * UsageStats Component
 *
 * Shows system-wide usage statistics for a selected period.
 *
 * Related: T150 (US9)
 */

defineOptions({ name: 'SystemUsageStats' });

const props = withDefaults(
  defineProps<{
    stats: AdminUsageStats | null;
    loading?: boolean;
    error?: Error | null;
  }>(),
  {
    loading: false,
    error: null
  }
);

type UsagePeriod = 'day' | 'week' | 'month';

type AdminUsageStats = {
  period: UsagePeriod;
  totalOperations: number;
  byOperation: {
    parse: number;
    generate: number;
    export: number;
  };
  byProvider: {
    platform: number;
  };
  totalCost: number;
  uniqueUsers: number;
};

const periodModel = defineModel<UsagePeriod>('period', { required: true });

const { t } = useI18n();

const isInitialLoading = computed(() => props.loading && !props.stats);

const periodOptions = computed<Array<{ label: string; value: UsagePeriod }>>(() => [
  { label: t('admin.system.usage.periods.day'), value: 'day' },
  { label: t('admin.system.usage.periods.week'), value: 'week' },
  { label: t('admin.system.usage.periods.month'), value: 'month' }
]);

const emptyStats = computed<AdminUsageStats>(() => ({
  period: periodModel.value,
  totalOperations: 0,
  byOperation: {
    parse: 0,
    generate: 0,
    export: 0
  },
  byProvider: {
    platform: 0
  },
  totalCost: 0,
  uniqueUsers: 0
}));

const displayStats = computed(() => props.stats ?? emptyStats.value);

const formatCurrency = (value: number) => t('admin.system.currency', { amount: value.toFixed(2) });
</script>

<style lang="scss">
.system-usage-stats {
  // Reserved for component-specific styling
}
</style>
