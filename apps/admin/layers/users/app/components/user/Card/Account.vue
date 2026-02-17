<template>
  <UPageCard class="users-user-card-account">
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ $t('admin.users.detail.account') }}
      </h2>
    </template>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">{{ $t('admin.users.fields.role') }}</span>
        <UsersUserRoleSelector
          class="w-48"
          :model-value="roleValue"
          :disabled="updatingRole || isDeleted"
          @update:model-value="emitRoleChange"
        />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">{{ $t('admin.users.status.blocked') }}</span>
        <USwitch
          :model-value="blocked"
          size="sm"
          :disabled="updatingStatus || isDeleted"
          @update:model-value="emitBlockedChange"
        />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">{{ $t('admin.users.fields.status') }}</span>
        <UBadge :color="statusColor" variant="soft">
          {{ statusLabel }}
        </UBadge>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted">{{ $t('admin.users.fields.createdAt') }}</span>
          <span class="font-medium">{{ createdAt }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">{{ $t('admin.users.fields.updatedAt') }}</span>
          <span class="font-medium">{{ updatedAt }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">{{ $t('admin.users.fields.lastLoginAt') }}</span>
          <span class="font-medium">{{ lastLoginAt }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">{{ $t('admin.users.fields.deletedAt') }}</span>
          <span class="font-medium">{{ deletedAt }}</span>
        </div>
      </div>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * UserCardAccount Component
 *
 * Account information for the admin user detail page.
 */

import type { BadgeProps } from '#ui/types';
import type { Role } from '@int/schema';

defineOptions({ name: 'UsersUserCardAccount' });

defineProps<{
  roleValue: Role;
  updatingRole: boolean;
  blocked: boolean;
  updatingStatus: boolean;
  isDeleted: boolean;
  statusColor: BadgeProps['color'];
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  deletedAt: string;
}>();

const emit = defineEmits<{
  roleChange: [role: Role];
  blockedChange: [blocked: boolean];
}>();

const emitRoleChange = (role: Role | null) => {
  if (!role) return;
  emit('roleChange', role);
};

const emitBlockedChange = (value: boolean) => {
  emit('blockedChange', value);
};
</script>

<style lang="scss">
.users-user-card-account {
  // Reserved for account card styling
}
</style>
