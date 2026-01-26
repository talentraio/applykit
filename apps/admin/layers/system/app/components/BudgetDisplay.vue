<template>
  <UPageCard class="system-budget-display">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ $t('admin.system.budget') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('admin.system.budgetHelper') }}
        </p>
      </div>
    </template>

    <div v-if="isInitialLoading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="!config && error"
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
            {{ $t('admin.system.budgetUsed') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatCurrency(usedValue) }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.budgetCap') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatCurrency(capValue) }}
          </p>
        </div>
        <div class="rounded-lg border border-muted/20 bg-muted/5 p-4">
          <p class="text-xs text-muted">
            {{ $t('admin.system.budgetRemaining') }}
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ formatCurrency(remainingValue) }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-muted">
          <span>{{ $t('admin.system.budgetUsage') }}</span>
          <span>{{ $t('admin.system.percent', { value: usagePercent }) }}</span>
        </div>
        <UProgress :value="usagePercent" color="primary" size="md" />
      </div>

      <UAlert
        v-if="localError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="localError"
      />

      <form
        v-if="editable"
        class="flex flex-col gap-3 md:flex-row md:items-end"
        @submit.prevent="submitBudget"
      >
        <UFormField :label="$t('admin.system.budgetCap')" class="flex-1">
          <UInput
            v-model="capInput"
            type="number"
            min="0.01"
            step="0.01"
            size="sm"
            :disabled="isDisabled"
          />
        </UFormField>
        <UButton type="submit" :loading="saving" :disabled="isDisabled">
          {{ saving ? $t('admin.system.budgetSaving') : $t('admin.system.budgetUpdate') }}
        </UButton>
      </form>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * BudgetDisplay Component
 *
 * Shows platform budget usage and allows updating the cap.
 *
 * Related: T149 (US9)
 */

defineOptions({ name: 'SystemBudgetDisplay' });

const props = withDefaults(
  defineProps<{
    config: {
      globalBudgetCap: number;
      globalBudgetUsed: number;
    } | null;
    loading?: boolean;
    saving?: boolean;
    error?: Error | null;
    editable?: boolean;
  }>(),
  {
    loading: false,
    saving: false,
    error: null,
    editable: true
  }
);

const emit = defineEmits<{
  update: [cap: number];
}>();

const { t } = useI18n();

const capInput = ref('');
const localError = ref<string | null>(null);

const isInitialLoading = computed(() => props.loading && !props.config);
const isDisabled = computed(() => props.loading || props.saving || !props.config);

const capValue = computed(() => props.config?.globalBudgetCap ?? 0);
const usedValue = computed(() => props.config?.globalBudgetUsed ?? 0);
const remainingValue = computed(() => Math.max(0, capValue.value - usedValue.value));

const usagePercent = computed(() => {
  if (capValue.value <= 0) return 0;
  const percent = (usedValue.value / capValue.value) * 100;
  return Math.min(100, Math.round(percent));
});

const formatCurrency = (value: number) => t('admin.system.currency', { amount: value.toFixed(2) });

watch(
  () => props.config?.globalBudgetCap,
  value => {
    if (typeof value === 'number') {
      capInput.value = value.toString();
    }
  },
  { immediate: true }
);

const submitBudget = () => {
  localError.value = null;

  const parsed = Number(capInput.value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    localError.value = t('common.error.validation');
    return;
  }

  emit('update', parsed);
};
</script>

<style lang="scss">
.system-budget-display {
  // Reserved for component-specific styling
}
</style>
