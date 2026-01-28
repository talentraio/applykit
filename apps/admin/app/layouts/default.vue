<template>
  <UiAppShell class="admin-default-layout">
    <UDashboardGroup>
      <UDashboardSidebar v-model:open="sidebarOpen">
        <template #header>
          <NuxtLink
            to="/"
            class="admin-default-layout__sidebar-header flex items-center gap-2 px-3 py-2"
          >
            <UIcon name="i-lucide-shield-check" class="text-primary" />
            <span class="text-sm font-semibold">{{ appTitle }}</span>
          </NuxtLink>
        </template>

        <template #default>
          <UNavigationMenu
            :items="navLinks"
            orientation="vertical"
            class="admin-default-layout__sidebar-nav px-2"
          />
        </template>
      </UDashboardSidebar>

      <UDashboardPanel>
        <template #header>
          <UDashboardNavbar :title="appTitle" toggle-side="left">
            <template #right>
              <UDropdownMenu :items="userMenuItems">
                <UButton
                  icon="i-lucide-shield-check"
                  color="neutral"
                  variant="ghost"
                  :label="$t('admin.nav.admin')"
                />
              </UDropdownMenu>
            </template>
          </UDashboardNavbar>
        </template>

        <template #body>
          <UMain class="admin-default-layout__main">
            <slot />
          </UMain>
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UiAppShell>
</template>

<script setup lang="ts">
/**
 * Default Admin Layout
 *
 * Admin dashboard layout using Nuxt UI Pro Dashboard components
 * Per docs/design/mvp.md - Dashboard template patterns
 *
 * TR010 - Created as part of architecture refactoring
 * T155 [Phase 12] Admin default layout with admin navigation
 * TR014 - Refactored to use Nuxt UI Pro Dashboard components
 */

import type { DropdownMenuItem, NavigationMenuItem } from '#ui/types';

defineOptions({ name: 'AdminDefaultLayout' });

const { t } = useI18n();
const { logout } = useAuth();

const appTitle = 'ApplyKit Admin';

const sidebarOpen = ref(false);
let mediaQuery: MediaQueryList | null = null;

const handleMediaChange = (event: MediaQueryListEvent) => {
  sidebarOpen.value = event.matches;
};

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 1024px)');
  sidebarOpen.value = mediaQuery.matches;
  mediaQuery.addEventListener?.('change', handleMediaChange);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener?.('change', handleMediaChange);
});

const navLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: t('admin.nav.dashboard'),
    to: '/',
    icon: 'i-lucide-layout-dashboard'
  },
  {
    label: t('admin.nav.users'),
    to: '/users',
    icon: 'i-lucide-users'
  },
  {
    label: t('admin.nav.roles'),
    to: '/roles',
    icon: 'i-lucide-shield'
  },
  {
    label: t('admin.nav.system'),
    to: '/system',
    icon: 'i-lucide-settings'
  }
]);

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('auth.logout'),
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await logout();
      }
    }
  ]
]);
</script>
