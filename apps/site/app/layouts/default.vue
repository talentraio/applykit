<template>
  <div class="site-default-layout flex min-h-screen flex-col">
    <!-- Navbar -->
    <header
      class="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-default bg-default px-4 lg:px-6"
    >
      <!-- Left: Mobile Menu Button + Logo + Desktop Nav -->
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Button (left side) -->
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />

        <NuxtLink to="/dashboard" class="text-lg font-semibold">
          {{ appTitle }}
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden items-center gap-1 md:flex">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            :icon="link.icon"
            color="neutral"
            variant="ghost"
            size="sm"
          >
            {{ link.label }}
          </UButton>
        </nav>
      </div>

      <!-- Right: Profile Link -->
      <UButton
        to="/profile"
        icon="i-lucide-user"
        color="neutral"
        variant="ghost"
        :label="$t('nav.profile')"
        class="hidden sm:inline-flex"
      />
      <UButton
        to="/profile"
        icon="i-lucide-user"
        color="neutral"
        variant="ghost"
        class="sm:hidden"
      />
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Mobile Navigation Drawer -->
    <UDrawer v-model:open="isMobileMenuOpen" direction="left">
      <template #content>
        <div class="flex h-full flex-col">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between border-b border-default p-4">
            <span class="text-lg font-semibold">{{ $t('nav.menu') }}</span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="isMobileMenuOpen = false"
            />
          </div>

          <!-- Navigation Links -->
          <nav class="flex flex-col gap-1 p-4">
            <UButton
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              :icon="link.icon"
              color="neutral"
              variant="ghost"
              class="justify-start"
              block
              @click="isMobileMenuOpen = false"
            >
              {{ link.label }}
            </UButton>
          </nav>

          <!-- Drawer Footer -->
          <div class="mt-auto border-t border-default p-4">
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              class="justify-start"
              block
              @click="handleLogout"
            >
              {{ $t('auth.logout') }}
            </UButton>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Auth Modal -->
    <AuthModal />
  </div>
</template>

<script setup lang="ts">
/**
 * Default Site Layout
 *
 * Main layout with responsive navigation
 * - Desktop: horizontal navbar with links
 * - Mobile: burger menu opens drawer with navigation
 *
 * TR010 - Created as part of architecture refactoring
 * T154 [Phase 12] Default layout with navigation
 */

defineOptions({ name: 'SiteDefaultLayout' });

const { t } = useI18n();
const { logout } = useAuth();

const appTitle = 'ApplyKit';
const isMobileMenuOpen = ref(false);

const navLinks = computed(() => [
  {
    label: t('nav.dashboard'),
    to: '/dashboard',
    icon: 'i-lucide-layout-dashboard'
  },
  {
    label: t('nav.resumes'),
    to: '/resumes',
    icon: 'i-lucide-file-text'
  },
  {
    label: t('nav.vacancies'),
    to: '/vacancies',
    icon: 'i-lucide-briefcase'
  }
]);

const handleLogout = async () => {
  isMobileMenuOpen.value = false;
  await logout();
};
</script>
