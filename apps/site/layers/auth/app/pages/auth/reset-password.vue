<template>
  <div class="auth-reset-password-page flex min-h-screen flex-col items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <!-- Success State -->
      <template v-if="success">
        <div class="text-center">
          <UIcon name="i-lucide-check-circle" class="mx-auto h-12 w-12 text-success" />
          <h2 class="mt-4 text-xl font-semibold">{{ $t('auth.resetPassword.success') }}</h2>
          <p class="mt-2 text-muted">{{ $t('auth.resetPassword.successDescription') }}</p>
          <UButton class="mt-6" @click="openLoginModal">
            {{ $t('auth.resetPassword.signIn') }}
          </UButton>
        </div>
      </template>

      <!-- Error State (invalid/expired token) -->
      <template v-else-if="tokenError">
        <div class="text-center">
          <UIcon name="i-lucide-alert-circle" class="mx-auto h-12 w-12 text-error" />
          <h2 class="mt-4 text-xl font-semibold">{{ $t('auth.resetPassword.invalidToken') }}</h2>
          <p class="mt-2 text-muted">{{ $t('auth.resetPassword.invalidTokenDescription') }}</p>
          <UButton class="mt-6" variant="outline" @click="openForgotModal">
            {{ $t('auth.resetPassword.requestNew') }}
          </UButton>
        </div>
      </template>

      <!-- Form State -->
      <template v-else>
        <h2 class="mb-6 text-xl font-semibold">{{ $t('auth.resetPassword.title') }}</h2>

        <UForm :schema="resetSchema" :state="formState" class="space-y-4" @submit="handleSubmit">
          <UFormField :label="$t('auth.resetPassword.newPassword')" name="password">
            <UInput v-model="formState.password" type="password" class="w-full" />
            <template #hint>
              <span class="text-xs text-muted">
                {{ $t('auth.resetPassword.passwordHint') }}
              </span>
            </template>
          </UFormField>

          <UFormField :label="$t('auth.resetPassword.confirmPassword')" name="confirmPassword">
            <UInput v-model="formState.confirmPassword" type="password" class="w-full" />
          </UFormField>

          <!-- Error Message -->
          <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

          <!-- Submit Button -->
          <UButton block type="submit" :loading="loading">
            {{ $t('auth.resetPassword.submit') }}
          </UButton>
        </UForm>
      </template>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Reset Password Page
 *
 * Standalone page for password reset with token from URL.
 * Redirects to login modal on success.
 *
 * Feature: 003-auth-expansion
 */
import { z } from 'zod';

defineOptions({ name: 'AuthResetPasswordPage' });

definePageMeta({
  layout: 'auth'
});

const { t } = useI18n();
const route = useRoute();
const { resetPassword } = useAuth();

const token = computed(() => route.query.token as string | undefined);
const loading = ref(false);
const success = ref(false);
const tokenError = ref(false);
const errorMessage = ref<string | null>(null);

const resetSchema = z
  .object({
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
  password: '',
  confirmPassword: ''
});

// Check if token is present
onMounted(() => {
  if (!token.value) {
    tokenError.value = true;
  }
});

const handleSubmit = async () => {
  if (!token.value) {
    tokenError.value = true;
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    await resetPassword(token.value, formState.password);
    success.value = true;
  } catch (error: unknown) {
    if (isApiError(error) && error.status === 400) {
      tokenError.value = true;
    } else {
      errorMessage.value = t('auth.resetPassword.error');
    }
  } finally {
    loading.value = false;
  }
};

const openLoginModal = () => {
  navigateTo('/?auth=login');
};

const openForgotModal = () => {
  navigateTo('/?auth=forgot');
};
</script>
