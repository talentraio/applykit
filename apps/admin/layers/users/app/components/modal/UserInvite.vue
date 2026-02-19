<template>
  <UModal
    v-model:open="open"
    :title="$t('admin.users.invite.title')"
    class="users-user-invite-modal"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ $t('admin.users.invite.description') }}
        </p>

        <UAlert
          v-if="localError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="localError"
        />

        <UFormField :label="$t('admin.users.invite.email')">
          <UInput
            v-model="email"
            type="email"
            :placeholder="$t('admin.users.invite.emailPlaceholder')"
            :disabled="loading"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('admin.users.invite.role')">
          <UsersUserRoleSelector v-model="role" :disabled="loading" class="w-48" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="close">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="loading" :disabled="loading" @click="handleSubmit">
          {{ $t('admin.users.invite.submit') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * UserInviteModal Component
 *
 * Collects email and role to invite a new user.
 */

import type { Role } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';

defineOptions({ name: 'UsersUserInviteModal' });

const _props = withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false
  }
);

const emit = defineEmits<{
  submit: [payload: { email: string; role: Role }];
  close: [payload: UsersInviteModalClosePayload];
}>();

type UsersInviteModalClosePayload = { action: 'cancelled' } | { action: 'submitted' };

const open = defineModel<boolean>('open', { required: true });

const email = ref('');
const role = ref<Role>(USER_ROLE_MAP.PUBLIC);
const localError = ref<string | null>(null);

const { t } = useI18n();

const close = () => {
  open.value = false;
  emit('close', { action: 'cancelled' });
};

const resetForm = () => {
  email.value = '';
  role.value = USER_ROLE_MAP.PUBLIC;
  localError.value = null;
};

watch(
  open,
  value => {
    if (value) {
      resetForm();
    }
  },
  { immediate: true }
);

const handleSubmit = () => {
  localError.value = null;
  const trimmed = email.value.trim();

  if (!trimmed) {
    localError.value = t('common.error.validation');
    return;
  }

  emit('submit', { email: trimmed, role: role.value });
};
</script>

<style lang="scss">
.users-user-invite-modal {
  // Reserved for component-specific styling
}
</style>
