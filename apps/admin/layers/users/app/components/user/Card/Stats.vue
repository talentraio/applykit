<template>
  <UPageCard class="users-user-card-stats">
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ $t('admin.users.detail.stats') }}
      </h2>
    </template>

    <div class="space-y-5">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.resumeCount') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ stats.resumeCount }}</p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.vacancyCount') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ stats.vacancyCount }}</p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.generationCount') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ stats.generationCount }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.todayUsage') }}</p>
          <div class="mt-2 space-y-1 text-sm">
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.users.stats.operations.parse') }}</span>
              <span class="font-medium">{{ stats.todayUsage.parse }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.users.stats.operations.generate') }}</span>
              <span class="font-medium">{{ stats.todayUsage.generate }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>{{ $t('admin.users.stats.operations.export') }}</span>
              <span class="font-medium">{{ stats.todayUsage.export }}</span>
            </div>
          </div>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.totalGenerations') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ stats.totalGenerations }}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.users.stats.avgGenerationsPerDay30d') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatNumber(stats.averageGenerationsPerDay30d) }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.users.stats.avgGenerationsPerDay7d') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatNumber(stats.averageGenerationsPerDay7d) }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.users.stats.avgGenerationsPerWeek30d') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatNumber(stats.averageGenerationsPerWeek30d) }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.costLast30Days') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ formatCurrency(stats.costLast30Days) }}</p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">{{ $t('admin.users.stats.costMonthToDate') }}</p>
          <p class="mt-2 text-lg font-semibold">{{ formatCurrency(stats.costMonthToDate) }}</p>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * UserCardStats Component
 *
 * Usage statistics for the admin user detail page.
 */

type UserStats = {
  resumeCount: number;
  vacancyCount: number;
  generationCount: number;
  todayUsage: {
    parse: number;
    generate: number;
    export: number;
  };
  totalGenerations: number;
  averageGenerationsPerDay30d: number;
  averageGenerationsPerDay7d: number;
  averageGenerationsPerWeek30d: number;
  costLast30Days: number;
  costMonthToDate: number;
};

defineOptions({ name: 'UsersUserCardStats' });

defineProps<{
  stats: UserStats;
}>();

const { t } = useI18n();

const formatCurrency = (value: number) => t('admin.system.currency', { amount: value.toFixed(2) });

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
</script>

<style lang="scss">
.users-user-card-stats {
  // Reserved for stats card styling
}
</style>
