<template>
  <div class="auth-login-form space-y-6">
    <!-- OAuth Buttons -->
    <div class="space-y-3">
      <UButton
        block
        variant="outline"
        color="neutral"
        icon="i-simple-icons-google"
        :loading="loadingGoogle"
        @click="handleGoogleLogin"
      >
        {{ $t('auth.modal.login.google') }}
      </UButton>
      <UButton
        block
        variant="outline"
        color="neutral"
        icon="i-simple-icons-linkedin"
        :loading="loadingLinkedIn"
        @click="handleLinkedInLogin"
      >
        {{ $t('auth.modal.login.linkedin') }}
      </UButton>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-3">
      <div class="h-px flex-1 bg-[var(--ui-border)]" />
      <span class="text-muted text-sm">{{ $t('auth.modal.login.or') }}</span>
      <div class="h-px flex-1 bg-[var(--ui-border)]" />
    </div>

    <!-- Email/Password Form -->
    <UForm :schema="loginSchema" :state="formState" class="space-y-4" @submit="handleSubmit">
      <UFormField :label="$t('auth.modal.login.email')" name="email">
        <UInput v-model="formState.email" type="email" class="w-full" />
      </UFormField>

      <UFormField :label="$t('auth.modal.login.password')" name="password">
        <UInput
          v-model="formState.password"
          :type="showPassword ? 'text' : 'password'"
          class="w-full"
          :ui="{ trailing: 'pe-1' }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              aria-controls="password"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <!-- Error Message -->
      <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

      <!-- Forgot Password Link -->
      <div class="text-right">
        <UButton variant="link" color="primary" size="sm" @click="emit('switchView', 'forgot')">
          {{ $t('auth.modal.login.forgotPassword') }}
        </UButton>
      </div>

      <!-- Submit Button -->
      <UButton block type="submit" :loading="loading">
        {{ $t('auth.modal.login.submit') }}
      </UButton>
    </UForm>

    <!-- Register Link -->
    <p class="text-center text-sm text-muted">
      {{ $t('auth.modal.login.noAccount') }}
      <UButton variant="link" color="primary" size="sm" @click="emit('switchView', 'register')">
        {{ $t('auth.modal.login.register') }}
      </UButton>
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Login Form Component
 *
 * Handles email/password login and OAuth buttons.
 *
 * Feature: 003-auth-expansion
 */
import type { AuthModalView } from './useAuthModal';
import { z } from 'zod';
import { useAuthModal } from './useAuthModal';

defineOptions({ name: 'AuthModalLoginForm' });

const emit = defineEmits<{
  switchView: [view: AuthModalView];
}>();

const { t } = useI18n();
const { login, loginWithGoogle, loginWithLinkedIn } = useAuth();
const { closeAndRedirect, redirectUrl } = useAuthModal();
const route = useRoute();

const loading = ref(false);
const loadingGoogle = ref(false);
const loadingLinkedIn = ref(false);
const errorMessage = ref<string | null>(null);
const showPassword = ref(false);

const loginSchema = z.object({
  email: z.string().email(t('auth.modal.validation.emailInvalid')),
  password: z.string().min(1, t('auth.modal.validation.passwordRequired'))
});

const formState = reactive({
  email: '',
  password: ''
});

const handleGoogleLogin = () => {
  loadingGoogle.value = true;
  // Pass redirect URL via route query so OAuth can pick it up
  const redirect = redirectUrl.value;
  if (redirect && !route.query.redirect) {
    // Ensure redirect is in URL for OAuth state
    navigateTo({ query: { ...route.query, redirect } }, { replace: true });
  }
  loginWithGoogle();
};

const handleLinkedInLogin = () => {
  loadingLinkedIn.value = true;
  // Pass redirect URL via route query so OAuth can pick it up
  const redirect = redirectUrl.value;
  if (redirect && !route.query.redirect) {
    navigateTo({ query: { ...route.query, redirect } }, { replace: true });
  }
  loginWithLinkedIn();
};

const handleSubmit = async () => {
  loading.value = true;
  errorMessage.value = null;

  try {
    await login({
      email: formState.email,
      password: formState.password
    });
    closeAndRedirect();
  } catch (error: unknown) {
    if (isApiError(error)) {
      // 401 = wrong credentials (show inline, not handled by centralized handler for login)
      if (error.status === 401) {
        errorMessage.value = t('auth.modal.login.invalidCredentials');
      } else {
        // Other errors (including 403 account restrictions): show generic message
        errorMessage.value = t('auth.modal.login.error');
      }
    } else {
      errorMessage.value = t('auth.modal.login.error');
    }
  } finally {
    loading.value = false;
  }
};
</script>
