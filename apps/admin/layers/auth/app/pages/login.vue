<template>
  <div class="auth-login-page flex min-h-screen flex-col items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <UAlert
        v-if="accessDeniedMessage"
        color="error"
        variant="soft"
        icon="i-lucide-shield-alert"
        :title="accessDeniedMessage"
        class="mb-4"
      />
      <UAuthForm :providers="providers" :title="$t('auth.login.welcome')" icon="i-lucide-log-in">
        <template #description>
          {{ $t('auth.login.description') }}
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Login Page
 *
 * Separate login entry for admin users.
 *
 * Related: T139 (US8)
 */

defineOptions({ name: 'AuthLoginPage' });

definePageMeta({
  layout: 'auth'
});

const { t } = useI18n();
const { loginWithGoogle } = useAuth();
const route = useRoute();

const accessDeniedMessage = computed(() => {
  return route.query.error === 'forbidden' ? t('auth.login.forbidden') : null;
});

const providers = [
  {
    label: t('auth.login.google'),
    icon: 'i-simple-icons-google',
    color: 'neutral' as const,
    onClick: () => {
      loginWithGoogle();
    }
  }
];
</script>
