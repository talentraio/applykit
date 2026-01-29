<template>
  <div class="auth-register-form space-y-6">
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
        {{ $t('auth.modal.register.google') }}
      </UButton>
      <UButton
        block
        variant="outline"
        color="neutral"
        icon="i-simple-icons-linkedin"
        :loading="loadingLinkedIn"
        @click="handleLinkedInLogin"
      >
        {{ $t('auth.modal.register.linkedin') }}
      </UButton>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-3">
      <div class="h-px flex-1 bg-[var(--ui-border)]" />
      <span class="text-muted text-sm">{{ $t('auth.modal.register.or') }}</span>
      <div class="h-px flex-1 bg-[var(--ui-border)]" />
    </div>

    <!-- Registration Form -->
    <UForm :schema="registerSchema" :state="formState" class="space-y-4" @submit="handleSubmit">
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="$t('auth.modal.register.firstName')" name="firstName">
          <UInput v-model="formState.firstName" class="w-full" />
        </UFormField>

        <UFormField :label="$t('auth.modal.register.lastName')" name="lastName">
          <UInput v-model="formState.lastName" class="w-full" />
        </UFormField>
      </div>

      <UFormField :label="$t('auth.modal.register.email')" name="email">
        <UInput v-model="formState.email" type="email" class="w-full" />
      </UFormField>

      <UFormField :label="$t('auth.modal.register.password')" name="password">
        <UInput v-model="formState.password" type="password" class="w-full" />
        <template #hint>
          <span class="text-xs text-muted">
            {{ $t('auth.modal.register.passwordHint') }}
          </span>
        </template>
      </UFormField>

      <UFormField :label="$t('auth.modal.register.confirmPassword')" name="confirmPassword">
        <UInput v-model="formState.confirmPassword" type="password" class="w-full" />
      </UFormField>

      <!-- Error Message -->
      <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

      <!-- Submit Button -->
      <UButton block type="submit" :loading="loading">
        {{ $t('auth.modal.register.submit') }}
      </UButton>
    </UForm>

    <!-- Login Link -->
    <p class="text-center text-sm text-muted">
      {{ $t('auth.modal.register.hasAccount') }}
      <UButton variant="link" color="primary" size="sm" @click="emit('switchView', 'login')">
        {{ $t('auth.modal.register.login') }}
      </UButton>
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Register Form Component
 *
 * Handles email/password registration with validation.
 *
 * Feature: 003-auth-expansion
 */
import type { AuthModalView } from '../../composables/useAuthModal';
import { z } from 'zod';

defineOptions({ name: 'AuthModalRegisterForm' });

const emit = defineEmits<{
  switchView: [view: AuthModalView];
}>();

const { t } = useI18n();
const { register, loginWithGoogle, loginWithLinkedIn } = useAuth();
const { closeAndRedirect, redirectUrl } = useAuthModal();
const route = useRoute();

const loading = ref(false);
const loadingGoogle = ref(false);
const loadingLinkedIn = ref(false);
const errorMessage = ref<string | null>(null);

const registerSchema = z
  .object({
    firstName: z.string().min(1, t('auth.modal.validation.firstNameRequired')),
    lastName: z.string().min(1, t('auth.modal.validation.lastNameRequired')),
    email: z.string().email(t('auth.modal.validation.emailInvalid')),
    password: z
      .string()
      .min(8, t('auth.modal.validation.passwordMin'))
      .regex(/[A-Z]/, t('auth.modal.validation.passwordUppercase'))
      .regex(/\d/, t('auth.modal.validation.passwordNumber')),
    confirmPassword: z.string()
  })
  .refine(
    (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
    {
      message: t('auth.modal.validation.passwordMismatch'),
      path: ['confirmPassword']
    }
  );

const formState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const handleGoogleLogin = () => {
  loadingGoogle.value = true;
  // Pass redirect URL via route query so OAuth can pick it up
  const redirect = redirectUrl.value;
  if (redirect && !route.query.redirect) {
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
    await register({
      email: formState.email,
      password: formState.password,
      firstName: formState.firstName,
      lastName: formState.lastName
    });
    closeAndRedirect();
  } catch (error: unknown) {
    const fetchError = error as { data?: { message?: string }; statusCode?: number };
    if (fetchError.statusCode === 409) {
      errorMessage.value = t('auth.modal.register.emailExists');
    } else {
      errorMessage.value = fetchError.data?.message ?? t('auth.modal.register.error');
    }
  } finally {
    loading.value = false;
  }
};
</script>
