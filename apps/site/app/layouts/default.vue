<template>
  <div class="site-default-layout min-h-screen bg-background">
    <!-- Header / Navigation -->
    <header class="site-default-layout__header border-b">
      <div class="container mx-auto flex h-16 items-center justify-between px-4">
        <!-- Logo -->
        <NuxtLink to="/dashboard" class="site-default-layout__logo flex items-center gap-2">
          <span class="text-xl font-bold text-primary">ApplyKit</span>
        </NuxtLink>

        <!-- Navigation -->
        <nav class="site-default-layout__nav flex items-center gap-6">
          <NuxtLink
            to="/dashboard"
            class="text-sm font-medium text-muted transition-colors hover:text-foreground"
            active-class="text-foreground"
          >
            {{ $t('nav.dashboard') }}
          </NuxtLink>
          <NuxtLink
            to="/resumes"
            class="text-sm font-medium text-muted transition-colors hover:text-foreground"
            active-class="text-foreground"
          >
            {{ $t('nav.resumes') }}
          </NuxtLink>
          <NuxtLink
            to="/vacancies"
            class="text-sm font-medium text-muted transition-colors hover:text-foreground"
            active-class="text-foreground"
          >
            {{ $t('nav.vacancies') }}
          </NuxtLink>
        </nav>

        <!-- User Menu -->
        <div class="site-default-layout__user flex items-center gap-4">
          <NuxtLink
            to="/profile"
            class="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {{ $t('nav.profile') }}
          </NuxtLink>
          <UButton color="neutral" variant="ghost" size="sm" @click="handleLogout">
            {{ $t('auth.logout') }}
          </UButton>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="site-default-layout__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Default Site Layout
 *
 * Main layout with navigation header for authenticated pages.
 * Used for dashboard, resumes, vacancies, profile pages.
 *
 * TR010 - Created as part of architecture refactoring
 * T152 [Phase 12] Default layout with navigation
 */

defineOptions({ name: 'SiteDefaultLayout' });

const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
};
</script>

<style lang="scss">
.site-default-layout {
  &__header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--ui-bg);
  }
}
</style>
