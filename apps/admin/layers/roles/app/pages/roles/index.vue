<template>
  <div class="admin-roles-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.roles.title')" />

    <div class="mt-6 space-y-4">
      <div v-if="isInitialLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="listError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="listError.message"
      />

      <UPageCard v-else-if="roles.length === 0" class="text-center">
        <div class="py-10 text-sm text-muted">
          {{ $t('admin.roles.empty') }}
        </div>
      </UPageCard>

      <div v-else class="grid gap-4 lg:grid-cols-2">
        <RolesRoleCard v-for="role in roles" :key="role.role" :role="role" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Roles Page
 *
 * Lists all roles and links to role-specific settings.
 */

defineOptions({ name: 'AdminRolesPage' });

const { roles, loading, error, fetchRoles } = useAdminRoles();
const isInitialLoading = computed(() => loading.value && roles.value.length === 0);
const listError = computed(() => (roles.value.length === 0 ? error.value : null));

await callOnce('admin-roles', async () => {
  await fetchRoles();
});

// Reserved for future helper functions.
</script>

<style lang="scss">
.admin-roles-page {
  &__card {
    // Reserved for card-specific styling
  }
}
</style>
