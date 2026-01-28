<template>
  <UPageCard class="roles-role-card">
    <div class="roles-role-card__header flex items-start justify-between gap-4">
      <div>
        <h3 class="text-base font-semibold">
          {{ roleLabel }}
        </h3>
        <p class="text-xs text-muted">
          {{ role.role }}
        </p>
      </div>
      <UButton :to="`/roles/${role.role}`" size="sm" color="neutral" variant="ghost">
        {{ $t('admin.roles.manage') }}
      </UButton>
    </div>

    <div class="roles-role-card__details mt-4 space-y-2 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.roles.fields.platformLlm') }}</span>
        <UBadge class="w-20 flex justify-center" :color="statusColor(role.platformLlmEnabled)">
          {{ statusLabel(role.platformLlmEnabled) }}
        </UBadge>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.roles.fields.byok') }}</span>
        <UBadge class="w-20 flex justify-center" :color="statusColor(role.byokEnabled)">
          {{ statusLabel(role.byokEnabled) }}
        </UBadge>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.roles.fields.provider') }}</span>
        <span class="font-medium">{{ providerLabel }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-muted">{{ $t('admin.roles.fields.dailyBudget') }}</span>
        <span class="font-medium">{{ budgetLabel }}</span>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * RoleCard Component
 *
 * Displays role summary and link to role detail.
 */

import type { RoleSettings } from '@int/schema';
import { PLATFORM_PROVIDER_MAP, USER_ROLE_MAP } from '@int/schema';

defineOptions({ name: 'RolesRoleCard' });

const props = defineProps<{
  role: RoleSettings;
}>();

const { t, te } = useI18n();

const roleLabel = computed(() => {
  const key = `admin.roles.names.${props.role.role}`;
  return te(key) ? t(key) : props.role.role;
});

const providerLabel = computed(() => {
  if (props.role.platformProvider === PLATFORM_PROVIDER_MAP.GEMINI_FLASH) {
    return t('admin.system.providers.gemini_flash');
  }

  return t('admin.system.providers.openai');
});

const statusLabel = (enabled: boolean) =>
  enabled ? t('admin.system.status.enabled') : t('admin.system.status.disabled');

const statusColor = (enabled: boolean) => (enabled ? 'success' : 'warning');

const budgetLabel = computed(() => {
  if (props.role.role === USER_ROLE_MAP.SUPER_ADMIN) {
    return t('common.unlimited');
  }

  return t('admin.system.currency', { amount: props.role.dailyBudgetCap.toFixed(2) });
});
</script>
