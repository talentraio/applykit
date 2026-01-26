<template>
  <div class="users-user-role-selector">
    <USelectMenu
      :model-value="model"
      :items="roleOptions"
      value-key="value"
      size="sm"
      :disabled="disabled"
      :aria-label="$t('admin.users.role')"
      @update:model-value="updateRole"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * UserRoleSelector Component
 *
 * Role selector for admin user management.
 *
 * Related: T138 (US8)
 */

import type { Role } from '@int/schema';

defineOptions({ name: 'UsersUserRoleSelector' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false
  }
);

const { t } = useI18n();

const model = defineModel<Role>({ required: true });

const { disabled } = toRefs(props);

const roleOptions = computed<Array<{ label: string; value: Role }>>(() => [
  { label: t('admin.users.roles.super_admin'), value: 'super_admin' },
  { label: t('admin.users.roles.friend'), value: 'friend' },
  { label: t('admin.users.roles.public'), value: 'public' }
]);

const updateRole = (value: Role | null) => {
  if (!value) return;
  model.value = value;
};
</script>

<style lang="scss">
.users-user-role-selector {
  // Reserved for component-specific styling
}
</style>
