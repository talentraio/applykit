<template>
  <div class="flex min-h-screen flex-col items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm :providers="providers" :title="$t('auth.login.welcome')" icon="i-lucide-log-in">
        <template #description>
          {{ $t('auth.login.description') }}
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  layout: 'auth'
})

const providers = [
  {
    label: t('auth.login.google'),
    icon: 'i-simple-icons-google',
    color: 'neutral' as const,
    onClick: async () => {
      // Redirect to Google OAuth endpoint
      await navigateTo('/api/auth/google', { external: true })
    }
  }
]
</script>
