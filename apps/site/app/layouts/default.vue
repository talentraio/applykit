<template>
  <UiAppShell class="site-default-layout">
    <UDashboardNavbar :title="appTitle" :links="navLinks">
      <template #right>
        <UDropdown :items="userMenuItems">
          <UButton
            icon="i-lucide-user"
            color="neutral"
            variant="ghost"
            :label="$t('nav.account')"
          />
        </UDropdown>
      </template>
    </UDashboardNavbar>

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
  </UiAppShell>
</template>

<script setup lang="ts">
/**
 * Default Site Layout
 *
 * Main layout using Nuxt UI Pro Dashboard components
 * Per docs/design/mvp.md - SaaS template patterns
 *
 * TR010 - Created as part of architecture refactoring
 * T152 [Phase 12] Default layout with navigation
 * TR014 - Refactored to use Nuxt UI Pro components
 */

import type { DropdownMenuItem } from '#ui/types';

defineOptions({ name: 'SiteDefaultLayout' });

const { t } = useI18n();
const { logout } = useAuth();

const appTitle = 'ApplyKit';

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

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('nav.profile'),
      icon: 'i-lucide-user',
      to: '/profile'
    }
  ],
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
