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
import { USER_ROLE_MAP } from '@int/schema';

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
  { label: t('admin.users.roles.super_admin'), value: USER_ROLE_MAP.SUPER_ADMIN },
  { label: t('admin.users.roles.friend'), value: USER_ROLE_MAP.FRIEND },
  { label: t('admin.users.roles.public'), value: USER_ROLE_MAP.PUBLIC }
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
