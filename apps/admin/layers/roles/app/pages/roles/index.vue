<template>
  <div class="admin-roles-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.roles.title')" />

    <div class="mt-6 space-y-4">
      <div v-if="pageLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UPageCard v-else-if="roles.length === 0" class="text-center">
        <div class="py-10 text-sm text-muted">
          {{ $t('admin.roles.empty') }}
        </div>
      </UPageCard>

      <RolesListTable v-else :roles="roles" />
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

const { roles, fetchRoles } = useAdminRoles();
const { t } = useI18n();
const toast = useToast();

const notifyError = (error: unknown) => {
  if (!import.meta.client) return;

  toast.add({
    title: t('common.error.generic'),
    description: error instanceof Error ? error.message : undefined,
    color: 'error'
  });
};

const pageLoading = ref(true);

try {
  await fetchRoles();
} catch (error) {
  notifyError(error);
} finally {
  pageLoading.value = false;
}
</script>

<style lang="scss">
.admin-roles-page {
  // Reserved for page-specific styling.
}
</style>
