<template>
  <div class="admin-default-layout min-h-screen bg-background">
    <!-- Header / Navigation -->
    <header class="admin-default-layout__header border-b bg-neutral-900 dark:bg-neutral-950">
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <!-- Logo -->
        <NuxtLink to="/" class="admin-default-layout__logo flex items-center gap-2">
          <span class="text-xl font-bold text-white">ApplyKit Admin</span>
        </NuxtLink>

        <!-- Navigation -->
        <nav class="admin-default-layout__nav flex items-center gap-6">
          <NuxtLink
            to="/"
            class="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            active-class="text-white"
          >
            {{ $t('admin.nav.dashboard') }}
          </NuxtLink>
          <NuxtLink
            to="/users"
            class="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            active-class="text-white"
          >
            {{ $t('admin.nav.users') }}
          </NuxtLink>
          <NuxtLink
            to="/system"
            class="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            active-class="text-white"
          >
            {{ $t('admin.nav.system') }}
          </NuxtLink>
        </nav>

        <!-- User Menu -->
        <div class="admin-default-layout__user flex items-center gap-4">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="text-white"
            @click="handleLogout"
          >
            {{ $t('auth.logout') }}
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-default-layout__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Default Admin Layout
 *
 * Main layout with navigation header for admin pages.
 * Dark header to distinguish from site app.
 *
 * TR010 - Created as part of architecture refactoring
 * T153 [Phase 12] Admin default layout with admin navigation
 */

defineOptions({ name: 'AdminDefaultLayout' });

const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
};
</script>

<style lang="scss">
.admin-default-layout {
  &__header {
    position: sticky;
    top: 0;
    z-index: 50;
  }
}
</style>
