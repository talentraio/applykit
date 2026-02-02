<template>
  <UModal v-model:open="isModalOpen" :title="modalTitle" :description="modalDescription">
    <template #body>
      <AuthModalLoginForm v-if="view === 'login'" @switch-view="handleSwitchView" />
      <AuthModalRegisterForm v-else-if="view === 'register'" @switch-view="handleSwitchView" />
      <AuthModalForgotPasswordForm v-else-if="view === 'forgot'" @switch-view="handleSwitchView" />
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
import type { AuthModalView } from '../../composables/useAuthModal';

defineOptions({ name: 'AuthModal' });

const { t } = useI18n();
const { isOpen, view, close, switchView } = useAuthModal();

// Sync modal open state with composable
const isModalOpen = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (!value) close();
  }
});

const modalTitle = computed(() => {
  switch (view.value) {
    case 'login':
      return t('auth.modal.login.title');
    case 'register':
      return t('auth.modal.register.title');
    case 'forgot':
      return t('auth.modal.forgot.title');
    default:
      return '';
  }
});

const modalDescription = computed(() => {
  switch (view.value) {
    case 'login':
      return t('auth.login.description');
    case 'register':
      return t('auth.modal.register.description');
    case 'forgot':
      return t('auth.modal.forgot.description');
    default:
      return '';
  }
});

const handleSwitchView = (newView: AuthModalView) => {
  switchView(newView);
};
</script>
