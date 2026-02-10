<template>
  <UPageCard class="roles-item-settings">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ $t('admin.roles.settingsTitle') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('admin.roles.settingsDescription') }}
        </p>
      </div>
    </template>

    <div v-if="isInitialLoading" class="flex items-center justify-center py-6">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else class="space-y-5">
      <UAlert
        v-if="isSuperAdmin"
        color="warning"
        variant="soft"
        icon="i-lucide-shield-check"
        :title="$t('admin.roles.superAdminHint')"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="$t('admin.roles.fields.platformLlm')">
          <USelectMenu
            v-model="platformLlmEnabled"
            :items="toggleOptions"
            value-key="value"
            size="sm"
            class="min-w-40 md:min-w-48"
            :search-input="false"
            :disabled="isRestricted || isDisabled"
          />
        </UFormField>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <UFormField :label="$t('admin.roles.fields.dailyBudget')">
          <div v-if="isSuperAdmin" class="flex h-10 items-center">
            <UBadge color="neutral" variant="soft">
              {{ $t('common.unlimited') }}
            </UBadge>
          </div>
          <UInput
            v-else
            v-model="dailyBudgetCap"
            type="number"
            min="0"
            step="0.01"
            size="sm"
            class="min-w-40 md:min-w-48"
            :disabled="isRestricted || isDisabled"
          />
        </UFormField>

        <UFormField :label="$t('admin.roles.fields.weeklyBudget')">
          <div v-if="isSuperAdmin" class="flex h-10 items-center">
            <UBadge color="neutral" variant="soft">
              {{ $t('common.unlimited') }}
            </UBadge>
          </div>
          <UInput
            v-else
            v-model="weeklyBudgetCap"
            type="number"
            min="0"
            step="0.01"
            size="sm"
            class="min-w-40 md:min-w-48"
            :disabled="isRestricted || isDisabled"
          />
        </UFormField>

        <UFormField :label="$t('admin.roles.fields.monthlyBudget')">
          <div v-if="isSuperAdmin" class="flex h-10 items-center">
            <UBadge color="neutral" variant="soft">
              {{ $t('common.unlimited') }}
            </UBadge>
          </div>
          <UInput
            v-else
            v-model="monthlyBudgetCap"
            type="number"
            min="0"
            step="0.01"
            size="sm"
            class="min-w-40 md:min-w-48"
            :disabled="isRestricted || isDisabled"
          />
        </UFormField>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UButton :loading="saving" :disabled="!canSave" @click="handleSave">
          {{ saving ? $t('common.loading') : $t('common.save') }}
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="isDisabled || !hasChanges"
          @click="resetForm"
        >
          {{ $t('common.clear') }}
        </UButton>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
import type { Role } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';

defineOptions({ name: 'RolesItemSettings' });

const props = defineProps<Props>();

type Props = {
  role: Role;
};

const { t } = useI18n();
const toast = useToast();

const { current, saving, fetchRole, updateRole } = useAdminRoles();

const platformLlmEnabled = ref(false);
const dailyBudgetCap = ref('0');
const weeklyBudgetCap = ref('0');
const monthlyBudgetCap = ref('0');

const notifyError = (error: unknown) => {
  if (!import.meta.client) return;

  toast.add({
    title: t('common.error.generic'),
    description: error instanceof Error ? error.message : undefined,
    color: 'error'
  });
};

const { pending } = await useAsyncData(
  'admin-role-settings',
  async () => {
    try {
      const settings = await fetchRole(props.role);
      platformLlmEnabled.value = settings.platformLlmEnabled;
      dailyBudgetCap.value = settings.dailyBudgetCap.toString();
      weeklyBudgetCap.value = settings.weeklyBudgetCap.toString();
      monthlyBudgetCap.value = settings.monthlyBudgetCap.toString();
      return settings;
    } catch (error) {
      notifyError(error);
      return null;
    }
  },
  {
    watch: [() => props.role]
  }
);

const isInitialLoading = computed(() => pending.value);

const isSuperAdmin = computed(() => props.role === USER_ROLE_MAP.SUPER_ADMIN);
const isRestricted = computed(() => isSuperAdmin.value);
const isDisabled = computed(() => pending.value || saving.value || !current.value);

const toggleOptions = computed<Array<{ label: string; value: boolean }>>(() => [
  { label: t('admin.system.status.enabled'), value: true },
  { label: t('admin.system.status.disabled'), value: false }
]);

const parsedDailyBudget = computed(() => Number(dailyBudgetCap.value));
const parsedWeeklyBudget = computed(() => Number(weeklyBudgetCap.value));
const parsedMonthlyBudget = computed(() => Number(monthlyBudgetCap.value));
const isBudgetValid = computed(
  () =>
    Number.isFinite(parsedDailyBudget.value) &&
    parsedDailyBudget.value >= 0 &&
    Number.isFinite(parsedWeeklyBudget.value) &&
    parsedWeeklyBudget.value >= 0 &&
    Number.isFinite(parsedMonthlyBudget.value) &&
    parsedMonthlyBudget.value >= 0
);

const hasChanges = computed(() => {
  if (!current.value) return false;

  return (
    platformLlmEnabled.value !== current.value.platformLlmEnabled ||
    parsedDailyBudget.value !== current.value.dailyBudgetCap ||
    parsedWeeklyBudget.value !== current.value.weeklyBudgetCap ||
    parsedMonthlyBudget.value !== current.value.monthlyBudgetCap
  );
});

const canSave = computed(() => !isDisabled.value && isBudgetValid.value && hasChanges.value);

const resetForm = () => {
  if (!current.value) return;

  platformLlmEnabled.value = current.value.platformLlmEnabled;
  dailyBudgetCap.value = current.value.dailyBudgetCap.toString();
  weeklyBudgetCap.value = current.value.weeklyBudgetCap.toString();
  monthlyBudgetCap.value = current.value.monthlyBudgetCap.toString();
};

watch(
  current,
  value => {
    if (!value) return;
    platformLlmEnabled.value = value.platformLlmEnabled;
    dailyBudgetCap.value = value.dailyBudgetCap.toString();
    weeklyBudgetCap.value = value.weeklyBudgetCap.toString();
    monthlyBudgetCap.value = value.monthlyBudgetCap.toString();
  },
  { immediate: true }
);

const handleSave = async () => {
  if (!current.value) return;

  if (!isBudgetValid.value) {
    notifyError(new Error(t('common.error.validation')));
    return;
  }

  try {
    await updateRole(props.role, {
      platformLlmEnabled: platformLlmEnabled.value,
      dailyBudgetCap: parsedDailyBudget.value,
      weeklyBudgetCap: parsedWeeklyBudget.value,
      monthlyBudgetCap: parsedMonthlyBudget.value
    });
  } catch (error) {
    notifyError(error);
  }
};
</script>

<style lang="scss">
.roles-item-settings {
  // Reserved for component-specific styles.
}
</style>
