<template>
  <header class="layout-header sticky top-0 z-50 border-b border-default bg-default">
    <div
      class="layout-header__content mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-4 lg:px-6"
    >
      <div class="layout-header__left flex items-center gap-4">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />

        <NuxtLink to="/" class="layout-header__logo text-lg font-semibold">
          {{ appTitle }}
        </NuxtLink>

        <nav class="layout-header__nav hidden items-center gap-1 md:flex">
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

      <div class="layout-header__right flex items-center gap-4">
        <div class="layout-header__actions flex items-center gap-2"></div>

        <div class="layout-header__profile">
          <UDropdownMenu :items="profileMenuItems">
            <UButton
              icon="i-lucide-user"
              color="neutral"
              variant="ghost"
              square
              :aria-label="t('nav.profile')"
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Shared site header with navigation and profile actions.
 */

defineOptions({ name: 'LayoutHeader' });

defineProps<{
  appTitle: string;
}>();

const isMobileMenuOpen = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const { logout } = useAuth();
const navLinks = useNavLinks();

const profileMenuItems = computed(() => [
  [
    {
      label: t('nav.profile'),
      icon: 'i-lucide-user',
      to: '/profile'
    },
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
