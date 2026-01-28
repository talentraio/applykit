<template>
  <div class="users-user-role-selector">
    <USelectMenu
      :model-value="model"
      :items="roleOptions"
      value-key="value"
      size="sm"
      class="w-full"
      :disabled="disabled"
      :aria-label="$t('admin.users.role')"
      :search-input="false"
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
import { USER_ROLE_VALUES } from '@int/schema';

defineOptions({ name: 'UsersUserRoleSelector' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false
  }
);

const { t, te } = useI18n();

const model = defineModel<Role>({ required: true });

const { disabled } = toRefs(props);

const roleOptions = computed<Array<{ label: string; value: Role }>>(() =>
  USER_ROLE_VALUES.map(role => {
    const key = `admin.users.roles.${role}`;
    return {
      label: te(key) ? t(key) : role,
      value: role
    };
  })
);

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
