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
        <UInput v-model="formState.password" type="password" class="w-full" />
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
import type { AuthModalView } from '../../composables/useAuthModal';
import { z } from 'zod';

defineOptions({ name: 'AuthModalLoginForm' });

const emit = defineEmits<{
  switchView: [view: AuthModalView];
}>();

const { t } = useI18n();
const { login, loginWithGoogle, loginWithLinkedIn } = useAuth();
const { close } = useAuthModal();

const loading = ref(false);
const loadingGoogle = ref(false);
const loadingLinkedIn = ref(false);
const errorMessage = ref<string | null>(null);

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
  loginWithGoogle();
};

const handleLinkedInLogin = () => {
  loadingLinkedIn.value = true;
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
    close();
  } catch (error: unknown) {
    const fetchError = error as { data?: { message?: string }; statusCode?: number };
    if (fetchError.statusCode === 401) {
      errorMessage.value = t('auth.modal.login.invalidCredentials');
    } else if (fetchError.statusCode === 403) {
      errorMessage.value = t('auth.modal.login.accountBlocked');
    } else {
      errorMessage.value = fetchError.data?.message ?? t('auth.modal.login.error');
    }
  } finally {
    loading.value = false;
  }
};
</script>
