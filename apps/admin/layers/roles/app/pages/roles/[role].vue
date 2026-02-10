<template>
  <div class="admin-role-detail-page p-4 md:p-6">
    <UiPageHeader :title="roleTitle">
      <template #actions>
        <UButton color="neutral" variant="ghost" size="sm" @click="goBack">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UiPageHeader>

    <div class="mt-6 space-y-4">
      <div class="space-y-4">
        <RolesItemSettings :role="role" />

        <RolesItemScenarios :role="role" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Role Detail Page
 *
 * Updates role-specific LLM settings.
 */

import { RoleSchema } from '@int/schema';

defineOptions({ name: 'AdminRoleDetailPage' });

const route = useRoute();
const { t, te } = useI18n();

const roleValidation = RoleSchema.safeParse(route.params.role);
if (!roleValidation.success) {
  throw createError({
    statusCode: 404,
    message: 'Role not found'
  });
}

const role = ref(roleValidation.data);

const roleTitle = computed(() => {
  const key = `admin.roles.names.${role.value}`;
  const label = te(key) ? t(key) : role.value;
  return t('admin.roles.detailTitle', { role: label });
});

const goBack = () => {
  navigateTo('/roles');
};

watch(
  () => route.params.role,
  value => {
    const validation = RoleSchema.safeParse(value);
    if (!validation.success) return;

    role.value = validation.data;
  }
);
</script>

<style lang="scss">
.admin-role-detail-page {
  // Reserved for page-specific styling.
}
</style>
