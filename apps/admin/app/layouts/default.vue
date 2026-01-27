<template>
  <UiAppShell class="admin-default-layout">
    <UDashboardNavbar :title="appTitle">
      <template #left>
        <div class="flex items-center gap-2">
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
        </div>
      </template>
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

    <UMain>
      <slot />
    </UMain>
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

import type { DropdownMenuItem } from '#ui/types';

defineOptions({ name: 'AdminDefaultLayout' });

const { t } = useI18n();
const { logout } = useAuth();

const appTitle = 'ApplyKit Admin';

const navLinks = computed(() => [
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
      click: async () => {
        await logout();
      }
    }
  ]
]);
</script>
