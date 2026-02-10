<template>
  <UCard class="roles-list-table">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th class="px-4 py-3">
              {{ $t('admin.roles.columns.name') }}
            </th>
            <th class="px-4 py-3">
              {{ $t('admin.roles.columns.platformLlm') }}
            </th>
            <th class="px-4 py-3">
              {{ $t('admin.roles.columns.monthlyBudget') }}
            </th>
            <th class="px-4 py-3">
              {{ $t('admin.roles.columns.dailyBudget') }}
            </th>
            <th class="px-4 py-3 text-right">
              {{ $t('admin.roles.columns.actions') }}
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-muted/20">
          <tr v-for="role in roles" :key="role.role" class="transition hover:bg-muted/10">
            <td class="px-4 py-3">
              <div>
                <p class="font-medium">{{ roleLabel(role.role) }}</p>
                <p class="text-xs text-muted">{{ role.role }}</p>
              </div>
            </td>

            <td class="px-4 py-3">
              <UBadge :color="statusColor(role.platformLlmEnabled)" variant="soft">
                {{ statusLabel(role.platformLlmEnabled) }}
              </UBadge>
            </td>

            <td class="px-4 py-3 text-muted">
              {{ monthlyBudgetLabel(role) }}
            </td>

            <td class="px-4 py-3 text-muted">
              {{ dailyBudgetLabel(role) }}
            </td>

            <td class="px-4 py-3 text-right">
              <UButton
                :to="`/roles/${role.role}`"
                size="md"
                color="neutral"
                variant="outline"
                class="min-w-[60px] justify-center"
              >
                {{ $t('admin.roles.edit') }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { RoleSettings } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';

defineOptions({ name: 'RolesListTable' });

defineProps<{
  roles: RoleSettings[];
}>();

const { t, te } = useI18n();

const roleLabel = (role: RoleSettings['role']): string => {
  const key = `admin.roles.names.${role}`;
  return te(key) ? t(key) : role;
};

const statusLabel = (enabled: boolean): string => {
  return enabled ? t('admin.system.status.enabled') : t('admin.system.status.disabled');
};

const statusColor = (enabled: boolean): 'success' | 'warning' => {
  return enabled ? 'success' : 'warning';
};

const isUnlimitedBudgetRole = (role: RoleSettings): boolean => {
  return role.role === USER_ROLE_MAP.SUPER_ADMIN;
};

const formatCurrency = (amount: number): string => {
  return t('admin.system.currency', { amount: amount.toFixed(2) });
};

const dailyBudgetLabel = (role: RoleSettings): string => {
  if (isUnlimitedBudgetRole(role)) {
    return t('common.unlimited');
  }

  return formatCurrency(role.dailyBudgetCap);
};

const monthlyBudgetLabel = (role: RoleSettings): string => {
  if (isUnlimitedBudgetRole(role)) {
    return t('common.unlimited');
  }

  return formatCurrency(role.monthlyBudgetCap);
};
</script>

<style lang="scss">
.roles-list-table {
  // Reserved for list table styles.
}
</style>
