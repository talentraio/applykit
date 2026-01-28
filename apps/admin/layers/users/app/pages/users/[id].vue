<template>
  <div class="admin-user-detail-page p-4 md:p-6">
    <UiPageHeader :title="title">
      <template #actions>
        <UButton color="neutral" variant="ghost" size="sm" @click="goBack">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UiPageHeader>

    <div class="mt-6 space-y-4">
      <div v-if="isInitialLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="detailError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="detailError.message"
      />

      <template v-else>
        <div class="grid gap-6 lg:grid-cols-2">
          <UsersUserCardAccount
            class="admin-user-detail-page__card"
            :role-value="roleValue"
            :updating-role="updatingRole"
            :blocked="blockedValue"
            :updating-status="updatingStatus"
            :status-color="statusColor"
            :status-label="statusLabel"
            :created-at="formatDate(user.createdAt)"
            :updated-at="formatDate(user.updatedAt)"
            :last-login-at="formatOptionalDate(user.lastLoginAt)"
            :deleted-at="formatOptionalDate(user.deletedAt)"
            @role-change="handleRoleChange"
            @blocked-change="handleBlockedChange"
          />
          <UsersUserCardProfile
            class="admin-user-detail-page__card"
            :profile="profile"
            :work-format-label="profile ? workFormatLabel(profile.workFormat) : ''"
            :languages-label="profile ? languagesLabel(profile.languages) : ''"
            :phones-label="profile ? phonesLabel(profile.phones) : ''"
            :profile-created-at="profile ? formatDate(profile.createdAt) : ''"
            :profile-updated-at="profile ? formatDate(profile.updatedAt) : ''"
          />
        </div>

        <UsersUserCardStats class="admin-user-detail-page__card mt-6" :stats="stats" />

        <div class="mt-6 flex justify-end">
          <UButton color="error" variant="outline" @click="isDeleteOpen = true">
            {{ $t('admin.users.delete.button') }}
          </UButton>
        </div>
      </template>
    </div>

    <UsersUserDeleteConfirmModal
      v-model:open="isDeleteOpen"
      :loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="closeDelete"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Admin User Detail Page
 *
 * Shows user profile and usage stats.
 */

import type { LanguageEntry, PhoneEntry, Role, WorkFormat } from '@int/schema';
import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { format, isValid, parse, parseISO } from 'date-fns';

defineOptions({ name: 'AdminUserDetailPage' });

const route = useRoute();
const { t, te } = useI18n();
const toast = useToast();

const { detail, loading, error, fetchUserDetail, updateRole, updateStatus, deleteUser } =
  useAdminUsers();

const userId = computed(() => String(route.params.id));

const pendingRole = ref<Role | null>(null);
const updatingRole = ref(false);
const pendingBlocked = ref<boolean | null>(null);
const updatingStatus = ref(false);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);

const isInitialLoading = computed(() => loading.value && !detail.value);
const detailError = computed(() => (!detail.value ? error.value : null));

await callOnce(`admin-user-${userId.value}`, async () => {
  await fetchUserDetail(userId.value);
});

watch(userId, async value => {
  pendingRole.value = null;
  updatingRole.value = false;
  pendingBlocked.value = null;
  updatingStatus.value = false;
  try {
    await fetchUserDetail(value);
  } catch {
    // Error is already exposed via store state
  }
});

const user = computed(() => {
  if (!detail.value) {
    return {
      id: '',
      email: '',
      role: USER_ROLE_MAP.PUBLIC,
      status: USER_STATUS_MAP.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null
    };
  }

  return detail.value.user;
});

const profile = computed(() => detail.value?.profile ?? null);
const stats = computed(
  () =>
    detail.value?.stats ?? {
      resumeCount: 0,
      vacancyCount: 0,
      generationCount: 0,
      todayUsage: {
        parse: 0,
        generate: 0,
        export: 0
      },
      totalGenerations: 0,
      averageGenerationsPerDay30d: 0,
      averageGenerationsPerDay7d: 0,
      averageGenerationsPerWeek30d: 0,
      costLast30Days: 0,
      costMonthToDate: 0
    }
);

const title = computed(() => {
  if (!detail.value) return t('admin.users.detail.title');
  return t('admin.users.detail.titleWithEmail', { email: detail.value.user.email });
});

const roleValue = computed(() => pendingRole.value ?? user.value.role);
const blockedValue = computed(() => {
  if (pendingBlocked.value !== null) {
    return pendingBlocked.value;
  }
  return user.value.status === USER_STATUS_MAP.BLOCKED;
});

const statusLabel = computed(() => {
  const key = `admin.users.status.${user.value.status}`;
  return te(key) ? t(key) : user.value.status;
});

const statusColor = computed(() => {
  switch (user.value.status) {
    case USER_STATUS_MAP.ACTIVE:
      return 'success';
    case USER_STATUS_MAP.INVITED:
      return 'warning';
    case USER_STATUS_MAP.BLOCKED:
      return 'error';
    case USER_STATUS_MAP.DELETED:
      return 'neutral';
    default:
      return 'neutral';
  }
});

const handleRoleChange = async (role: Role) => {
  if (!detail.value) return;

  pendingRole.value = role;
  updatingRole.value = true;

  try {
    await updateRole(detail.value.user.id, role);
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
    pendingRole.value = null;
  } finally {
    updatingRole.value = false;
    pendingRole.value = null;
  }
};

const handleBlockedChange = async (blocked: boolean) => {
  if (!detail.value) return;

  pendingBlocked.value = blocked;
  updatingStatus.value = true;

  try {
    await updateStatus(detail.value.user.id, { blocked });
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
    pendingBlocked.value = null;
  } finally {
    updatingStatus.value = false;
    pendingBlocked.value = null;
  }
};

const resolveDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  const parsed = date.includes('T')
    ? parseISO(date)
    : parse(date, 'yyyy-MM-dd HH:mm:ss', new Date(0));
  return isValid(parsed) ? parsed : null;
};

const formatDate = (date: Date | string | null | undefined) => {
  const resolved = resolveDate(date);
  if (!resolved) {
    return t('common.notAvailable');
  }

  return format(resolved, 'dd.MM.yyyy HH:mm');
};

const formatOptionalDate = (date?: Date | string | null) => {
  return formatDate(date);
};

const workFormatLabel = (formatValue: WorkFormat) => {
  const key = `profile.form.workFormatOptions.${formatValue}`;
  return te(key) ? t(key) : formatValue;
};

const languagesLabel = (items: LanguageEntry[]) => {
  if (!items.length) return t('profile.languages.empty');
  return items.map(item => `${item.language} (${item.level})`).join(', ');
};

const phonesLabel = (items?: PhoneEntry[]) => {
  if (!items || items.length === 0) return t('profile.phones.empty');
  return items
    .map(item => (item.label ? `${item.number} (${item.label})` : item.number))
    .join(', ');
};

const goBack = () => {
  navigateTo('/users');
};

const closeDelete = () => {
  isDeleteOpen.value = false;
};

const confirmDelete = async () => {
  if (!detail.value) return;

  isDeleting.value = true;

  try {
    await deleteUser(detail.value.user.id);
    await navigateTo('/users');
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
  } finally {
    isDeleting.value = false;
    isDeleteOpen.value = false;
  }
};
</script>

<style lang="scss">
.admin-user-detail-page {
  &__card {
    // Reserved for card-specific styling
  }
}
</style>
