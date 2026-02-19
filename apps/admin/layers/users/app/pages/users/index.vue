<template>
  <div class="admin-users-page p-4 md:p-6">
    <UiPageHeader :title="$t('admin.users.title')" />

    <div class="mt-6 space-y-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="grid w-full gap-4 md:grid-cols-2">
          <UsersListSearch v-model="searchQuery" />
          <UsersListRoleFilter v-model="roleFilter" />
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
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
          <UButton size="sm" @click="openInviteModalFlow">
            {{ $t('admin.users.invite.button') }}
          </UButton>
        </div>
      </div>

      <div v-if="isInitialLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="listErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="listErrorMessage"
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
                  {{ $t('admin.users.columns.status') }}
                </th>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.createdAt') }}
                </th>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.updatedAt') }}
                </th>
                <th class="px-4 py-3">
                  {{ $t('admin.users.columns.lastLoginAt') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted/20">
              <tr
                v-for="user in users"
                :key="user.id"
                class="cursor-pointer transition hover:bg-muted/10"
                role="button"
                tabindex="0"
                @click="goToUser(user.id)"
                @keydown.enter="goToUser(user.id)"
              >
                <td class="px-4 py-3">
                  <span class="font-medium">
                    {{ user.email }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <UBadge color="neutral" variant="soft">
                    {{ roleLabel(user.role) }}
                  </UBadge>
                </td>
                <td class="px-4 py-3">
                  <UBadge :color="statusColor(user.status)" variant="soft">
                    {{ statusLabel(user.status) }}
                  </UBadge>
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatDate(user.updatedAt) }}
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ formatOptionalDate(user.lastLoginAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <div v-if="users.length > 0" class="flex flex-wrap items-center justify-between gap-3">
        <UsersListPageSizeSelect v-model="pageSize" />
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="pageSize"
          :disabled="pending"
          color="neutral"
          variant="outline"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Users Page
 *
 * Search and manage users.
 */

import type { Role } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'AdminUsersPage' });

const { users, total, fetchUsers, inviteUser, resendInvite } = useAdminUsers();
const { t, te } = useI18n();
const toast = useToast();
const { openInviteModal } = useUsersInviteModal();
const resendingInviteUserIds = new Set<string>();

const searchQuery = ref('');
const roleFilter = ref<Role | 'all'>('all');
const pageSize = ref(25);
const page = ref(1);

const query = computed(() => ({
  search: searchQuery.value.trim() || undefined,
  role: roleFilter.value === 'all' ? undefined : roleFilter.value,
  limit: pageSize.value,
  offset: (page.value - 1) * pageSize.value
}));

const {
  pending,
  error: usersError,
  refresh
} = await useAsyncData('admin-users', () => fetchUsers(query.value), {
  watch: [query]
});

const isInitialLoading = computed(() => pending.value && users.value.length === 0);
const listErrorMessage = computed(() => {
  if (users.value.length > 0) {
    return '';
  }

  const errorValue = usersError.value;
  if (!errorValue) {
    return '';
  }

  return errorValue instanceof Error ? errorValue.message : t('common.error.generic');
});

watch([searchQuery, roleFilter, pageSize], () => {
  page.value = 1;
});

watch([total, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value));
  if (page.value > maxPage) {
    page.value = maxPage;
  }
});

const clearSearch = () => {
  searchQuery.value = '';
};

const roleLabel = (role: Role) => {
  const key = `admin.users.roles.${role}`;
  return te(key) ? t(key) : role;
};

const statusLabel = (status: string) => {
  const key = `admin.users.status.${status}`;
  return te(key) ? t(key) : status;
};

const statusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'invited':
      return 'warning';
    case 'blocked':
      return 'error';
    case 'deleted':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const formatDate = (date: Date | string) => {
  const resolved = typeof date === 'string' ? parseISO(date) : date;
  return format(resolved, 'dd.MM.yyyy');
};

const formatOptionalDate = (date?: Date | string | null) => {
  if (!date) return t('common.notAvailable');
  return formatDate(date);
};

const goToUser = (id: string) => {
  navigateTo(`/users/${id}`);
};

const handleResendInvite = async (userId: string, failedToastId?: string) => {
  if (resendingInviteUserIds.has(userId)) {
    return;
  }

  resendingInviteUserIds.add(userId);

  try {
    const resendResult = await resendInvite(userId);

    if (resendResult.inviteEmailSent) {
      if (failedToastId) {
        toast.remove(failedToastId);
      }

      await refresh();

      toast.add({
        title: t('admin.users.invite.resendSuccess'),
        color: 'success'
      });

      return;
    }

    toast.add({
      title: t('admin.users.invite.resendFailed'),
      color: 'error'
    });
  } catch {
    toast.add({
      title: t('admin.users.invite.resendFailed'),
      color: 'error'
    });
  } finally {
    resendingInviteUserIds.delete(userId);
  }
};

const showInviteSendFailedToast = (userId: string) => {
  const toastId = `admin-invite-failed-${userId}-${Date.now()}`;

  toast.add({
    id: toastId,
    title: t('admin.users.invite.sendFailed'),
    description: t('admin.users.invite.resendHint'),
    color: 'error',
    duration: 0,
    actions: [
      {
        label: t('admin.users.invite.resendAction'),
        color: 'error',
        variant: 'soft',
        onClick: async () => {
          await handleResendInvite(userId, toastId);
        }
      }
    ]
  });
};

const handleInvite = async (payload: { email: string; role: Role }): Promise<boolean> => {
  try {
    const inviteResult = await inviteUser(payload);
    await refresh();

    if (inviteResult.inviteEmailSent) {
      toast.add({
        title: t('admin.users.invite.success'),
        color: 'success'
      });
      return true;
    }

    showInviteSendFailedToast(inviteResult.id);
    return true;
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
    return false;
  }
};

const openInviteModalFlow = async () => {
  await openInviteModal({
    onSubmit: handleInvite
  });
};
</script>

<style lang="scss">
.admin-users-page {
  &__table {
    // Table container styling can be extended here if needed
  }
}
</style>
