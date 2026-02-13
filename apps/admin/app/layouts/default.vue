<template>
  <UiAppShell class="admin-default-layout">
    <UDashboardGroup>
      <UDashboardSidebar v-model:open="sidebarOpen">
        <template #header>
          <NuxtLink
            to="/"
            class="admin-default-layout__sidebar-header flex flex-col items-start gap-1 px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="text-primary" />
              <span class="text-sm font-semibold">{{ appTitle }}</span>
            </div>

            <p class="text-xs text-muted mt-[6px]">Role: {{ currentRoleLabel }}</p>
          </NuxtLink>
        </template>

        <template #default>
          <div class="admin-default-layout__sidebar-content flex h-full flex-col">
            <UNavigationMenu
              :items="navLinks"
              orientation="vertical"
              class="admin-default-layout__sidebar-nav px-2"
            />

            <div class="mt-auto border-t border-default p-2">
              <UButton
                icon="i-lucide-log-out"
                color="neutral"
                variant="outline"
                class="w-full justify-start"
                @click="handleLogout"
              >
                {{ $t('auth.logout') }}
              </UButton>
            </div>
          </div>
        </template>
      </UDashboardSidebar>

      <UDashboardPanel>
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

import type { NavigationMenuItem } from '#ui/types';

defineOptions({ name: 'AdminDefaultLayout' });

const { t, te } = useI18n();
const { user, logout } = useAuth();

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
    label: t('admin.nav.llm'),
    type: 'trigger',
    icon: 'i-lucide-brain-circuit',
    defaultOpen: true,
    children: [
      {
        label: t('admin.nav.llmModels'),
        to: '/llm/models',
        icon: 'i-lucide-brain-circuit'
      },
      {
        label: t('admin.nav.llmRouting'),
        to: '/llm/routing',
        icon: 'i-lucide-route'
      }
    ]
  },
  {
    label: t('admin.nav.system'),
    to: '/system',
    icon: 'i-lucide-settings'
  }
]);

const currentRoleLabel = computed(() => {
  const role = user.value?.role;
  if (!role) {
    return '—';
  }

  const key = `admin.roles.names.${role}`;
  return te(key) ? t(key) : role;
});

const handleLogout = async (): Promise<void> => {
  await logout();
};
</script>
