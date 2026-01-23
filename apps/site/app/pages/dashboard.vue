<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-2xl">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            {{ $t('dashboard.title') }}
          </h1>
          <UButton color="neutral" variant="soft" icon="i-lucide-log-out" @click="handleLogout">
            {{ $t('auth.logout') }}
          </UButton>
        </div>
      </template>

      <div v-if="user" class="space-y-6">
        <div>
          <p class="text-lg text-muted">
            {{ $t('dashboard.welcome', { name: user.name }) }}
          </p>
        </div>

        <UDivider />

        <div class="space-y-4">
          <div>
            <p class="text-sm font-medium text-muted">
              {{ $t('dashboard.email') }}
            </p>
            <p class="text-base">
              {{ user.email }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-muted">
              {{ $t('dashboard.role') }}
            </p>
            <p class="text-base capitalize">
              {{ user.role }}
            </p>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
/**
 * Dashboard Page
 *
 * Main authenticated landing page showing user information
 * and quick access to key features
 *
 * T069 [US1] Dashboard page
 */

const { user, logout } = useCurrentUser()
const handleLogout = async () => {
  try {
    await logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>
