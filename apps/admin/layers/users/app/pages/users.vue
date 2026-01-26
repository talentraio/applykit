<template>
  <div class="admin-users-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.users.title')" />

    <div class="mt-6 space-y-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <UsersUserSearch v-model="searchQuery" class="w-full md:max-w-md" />
        <div class="flex items-center gap-3 text-sm text-muted">
          <span>{{ $t('admin.users.count', { count: total }) }}</span>
          <UButton
            v-if="searchQuery.length > 0"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearSearch"
          >
            {{ $t('common.clear') }}
          </UButton>
        </div>
      </div>

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

      <UPageCard v-else-if="users.length === 0" class="text-center">
        <div class="py-10 text-sm text-muted">
          {{ $t('admin.users.empty') }}
        </div>
      </UPageCard>

      <UCard v-else class="admin-users-page__table">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.email') }}
                </th>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.role') }}
                </th>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.createdAt') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted/20">
              <tr v-for="user in users" :key="user.id">
                <td class="px-4 py-3">
                  <span class="font-medium">
                    {{ user.email }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <UsersUserRoleSelector
                    :model-value="roleValue(user.id, user.role)"
                    :disabled="updatingUserId === user.id"
                    @update:model-value="handleRoleChange(user.id, $event)"
                  />
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatDate(user.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Users Page
 *
 * Search and manage user roles.
 *
 * Related: T140 (US8)
 */

import type { Role } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'AdminUsersPage' });

const { users, total, loading, error, fetchUsers, updateRole } = useAdminUsers();
const { t } = useI18n();
const toast = useToast();

const searchQuery = ref('');
const updatingUserId = ref<string | null>(null);
const pendingRoles = ref<Record<string, Role>>({});

const isInitialLoading = computed(() => loading.value && users.value.length === 0);
const listError = computed(() => (users.value.length === 0 ? error.value : null));

const loadUsers = async () => {
  await fetchUsers({
    search: searchQuery.value.trim() || undefined,
    limit: 50,
    offset: 0
  });
};

await callOnce('admin-users', async () => {
  await loadUsers();
});

watch(searchQuery, async () => {
  try {
    await loadUsers();
  } catch {
    // Error is already exposed via store state
  }
});

const clearSearch = () => {
  searchQuery.value = '';
};

const roleValue = (id: string, fallbackRole: Role) => {
  return pendingRoles.value[id] ?? fallbackRole;
};

const handleRoleChange = async (id: string, role: Role) => {
  const currentRole = users.value.find(user => user.id === id)?.role ?? role;

  pendingRoles.value[id] = role;
  updatingUserId.value = id;

  try {
    await updateRole(id, role);
  } catch {
    pendingRoles.value[id] = currentRole;
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
  } finally {
    updatingUserId.value = null;
    delete pendingRoles.value[id];
  }
};

const formatDate = (date: Date | string) => {
  const resolved = typeof date === 'string' ? parseISO(date) : date;
  return format(resolved, 'MMM d, yyyy');
};
</script>

<style lang="scss">
.admin-users-page {
  &__table {
    // Table container styling can be extended here if needed
  }
}
</style>
