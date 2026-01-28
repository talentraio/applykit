<template>
  <div class="users-list-role-filter">
    <UFormField :label="$t('admin.users.filters.role')">
      <USelectMenu v-model="model" :items="roleOptions" value-key="value" size="lg" />
    </UFormField>
  </div>
</template>

<script setup lang="ts">
/**
 * UserRoleFilter Component
 *
 * Role filter for admin users list.
 */

import type { Role } from '@int/schema';
import { USER_ROLE_VALUES } from '@int/schema';

defineOptions({ name: 'UsersListRoleFilter' });

const { t, te } = useI18n();

const model = defineModel<Role | 'all'>({ default: 'all' });

const roleOptions = computed<Array<{ label: string; value: Role | 'all' }>>(() => [
  { label: t('admin.users.filters.roleAll'), value: 'all' },
  ...USER_ROLE_VALUES.map(role => {
    const key = `admin.users.roles.${role}`;
    return {
      label: te(key) ? t(key) : role,
      value: role
    };
  })
]);
</script>

<style lang="scss">
.users-list-role-filter {
  // Reserved for component-specific styling
}
</style>
