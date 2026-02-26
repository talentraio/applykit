<template>
  <UModal v-model:open="isModalOpen" :title="modalTitle" :description="modalDescription">
    <template #body>
      <AuthModalLoginForm v-if="activeView === 'login'" @switch-view="handleSwitchView" />
      <AuthModalRegisterForm
        v-else-if="activeView === 'register'"
        @switch-view="handleSwitchView"
      />
      <AuthModalForgotPasswordForm
        v-else-if="activeView === 'forgot'"
        @switch-view="handleSwitchView"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Auth Modal Container
 *
 * Container component that renders the appropriate auth form
 * based on URL state (?auth=login|register|forgot).
 *
 * Feature: 003-auth-expansion
 */
import type { AuthModalView } from './useAuthModal';
import { useAuthModal } from './useAuthModal';

defineOptions({ name: 'AuthModal' });

const { t } = useI18n();
const { isOpen, view, close, switchView } = useAuthModal();
const activeView = computed<AuthModalView>(() => view.value ?? 'login');

// Sync modal open state with composable
const isModalOpen = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (!value) close();
  }
});

const modalTitle = computed(() => {
  switch (activeView.value) {
    case 'login':
      return t('auth.modal.login.title');
    case 'register':
      return t('auth.modal.register.title');
    case 'forgot':
      return t('auth.modal.forgot.title');
    default:
      return t('auth.modal.login.title');
  }
});

const modalDescription = computed(() => {
  switch (activeView.value) {
    case 'login':
      return t('auth.login.description');
    case 'register':
      return t('auth.modal.register.description');
    case 'forgot':
      return t('auth.modal.forgot.description');
    default:
      return t('auth.login.description');
  }
});

const handleSwitchView = (newView: AuthModalView) => {
  switchView(newView);
};
</script>
