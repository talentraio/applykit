<template>
  <UModal
    v-model:open="isOpen"
    :dismissible="false"
    :close="false"
    :title="$t('auth.legal.title')"
    :description="$t('auth.legal.description')"
  >
    <template #body>
      <div class="auth-legal-consent-modal__agreement">
        <UCheckbox v-model="accepted" :label="$t('auth.legal.checkbox')" />

        <p class="mt-2 text-sm text-muted">
          {{ $t('auth.legal.agreement') }}
          <NuxtLink to="/terms" target="_blank" class="text-primary hover:underline">
            {{ $t('auth.legal.termsLink') }}
          </NuxtLink>
          {{ $t('auth.legal.and') }}
          <NuxtLink to="/privacy" target="_blank" class="text-primary hover:underline">
            {{ $t('auth.legal.privacyLink') }}
          </NuxtLink>
        </p>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="$t('auth.legal.accept')"
        :disabled="!accepted"
        :loading="saving"
        block
        @click="handleAccept"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthLegalConsentModal' });

const { acceptTerms } = useAuth();
const isOpen = ref(true);

const accepted = ref(false);
const saving = ref(false);

const handleAccept = async () => {
  if (!accepted.value) return;

  saving.value = true;
  try {
    await acceptTerms();
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss">
.auth-legal-consent-modal__agreement {
  @apply rounded-lg border border-neutral-200 p-4 dark:border-neutral-700;
}
</style>
