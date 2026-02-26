<template>
  <div class="auth-forgot-form space-y-6">
    <!-- Success State -->
    <template v-if="emailSent">
      <UAlert
        color="success"
        variant="soft"
        icon="i-lucide-mail-check"
        :title="$t('auth.modal.forgot.emailSent')"
        :description="$t('auth.modal.forgot.emailSentDescription')"
      />

      <UButton block variant="outline" @click="emit('switchView', 'login')">
        {{ $t('auth.modal.forgot.backToLogin') }}
      </UButton>
    </template>

    <!-- Form State -->
    <template v-else>
      <p class="text-muted text-sm">
        {{ $t('auth.modal.forgot.description') }}
      </p>

      <UForm :schema="forgotSchema" :state="formState" class="space-y-4" @submit="handleSubmit">
        <UFormField :label="$t('auth.modal.forgot.email')" name="email">
          <UInput v-model="formState.email" type="email" class="w-full" />
        </UFormField>

        <!-- Error Message -->
        <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />

        <!-- Submit Button -->
        <UButton block type="submit" :loading="loading">
          {{ $t('auth.modal.forgot.submit') }}
        </UButton>
      </UForm>

      <!-- Back to Login Link -->
      <p class="text-center text-sm text-muted">
        {{ $t('auth.modal.forgot.remembered') }}
        <UButton variant="link" color="primary" size="sm" @click="emit('switchView', 'login')">
          {{ $t('auth.modal.forgot.backToLogin') }}
        </UButton>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Forgot Password Form Component
 *
 * Handles password reset request.
 *
 * Feature: 003-auth-expansion
 */
import type { AuthModalView } from './useAuthModal';
import { z } from 'zod';

defineOptions({ name: 'AuthModalForgotPasswordForm' });

const emit = defineEmits<{
  switchView: [view: AuthModalView];
}>();

const { t } = useI18n();
const { forgotPassword } = useAuth();

const loading = ref(false);
const emailSent = ref(false);
const errorMessage = ref<string | null>(null);

const forgotSchema = z.object({
  email: z.string().email(t('auth.modal.validation.emailInvalid'))
});

const formState = reactive({
  email: ''
});

const handleSubmit = async () => {
  loading.value = true;
  errorMessage.value = null;

  try {
    await forgotPassword(formState.email);
    emailSent.value = true;
  } catch (error: unknown) {
    if (isApiError(error)) {
      errorMessage.value = t('auth.modal.forgot.error');
    } else {
      errorMessage.value = t('auth.modal.forgot.error');
    }
  } finally {
    loading.value = false;
  }
};
</script>
