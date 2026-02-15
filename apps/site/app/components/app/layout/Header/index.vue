<template>
  <header class="app-layout-header sticky top-0 z-50 border-b border-default bg-default">
    <div
      class="app-layout-header__content mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-4 lg:px-6"
    >
      <div class="app-layout-header__left flex h-full items-center gap-12">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />

        <NuxtLink to="/" :aria-label="appTitle" class="app-layout-header__logo">
          <NuxtImg
            src="/img/logo.png"
            format="webp"
            :alt="appTitle"
            class="app-layout-header__logo-image block h-7 w-auto object-contain md:h-8"
          />
        </NuxtLink>

        <UNavigationMenu
          :items="desktopNavItems"
          color="neutral"
          variant="link"
          highlight
          highlight-color="primary"
          class="app-layout-header__nav hidden self-end md:block"
          :ui="{
            list: 'gap-4',
            item: 'py-2',
            link: 'px-0 text-sm font-medium after:inset-x-0 after:-bottom-2'
          }"
        />
      </div>

      <div class="app-layout-header__right flex items-center gap-4">
        <div class="app-layout-header__actions flex items-center gap-2"></div>

        <div class="app-layout-header__profile">
          <UDropdownMenu :items="profileMenuItems">
            <UAvatar
              :src="avatarSrc"
              :alt="avatarAlt"
              :text="avatarInitials"
              size="lg"
              class="app-layout-header__avatar cursor-pointer"
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types';

/**
 * Shared site header with navigation and profile actions.
 */

defineOptions({ name: 'AppLayoutHeader' });

defineProps<{
  appTitle: string;
}>();

const isMobileMenuOpen = defineModel<boolean>('open', { default: false });

const { t } = useI18n();
const authStore = useAuthStore();
const { user, logout } = useAuth();
const route = useRoute();
const navLinks = useNavLinks();

const isDesktopNavLinkActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`);

const desktopNavItems = computed<NavigationMenuItem[]>(() =>
  navLinks.value.map(link => ({
    label: link.label,
    to: link.to,
    active: isDesktopNavLinkActive(link.to)
  }))
);

const avatarSrc = computed(() => authStore.profile?.photoUrl);

const avatarAlt = computed(() => {
  const profile = authStore.profile;
  const fullName = [profile?.firstName?.trim(), profile?.lastName?.trim()]
    .filter(Boolean)
    .join(' ');
  if (fullName.length > 0) {
    return fullName;
  }

  const email = profile?.email?.trim() ?? user.value?.email?.trim();
  return email && email.length > 0 ? email : t('nav.profile');
});

const avatarInitials = computed(() => {
  const profile = authStore.profile;
  const firstNameInitial = profile?.firstName?.trim().charAt(0).toUpperCase();
  const lastNameInitial = profile?.lastName?.trim().charAt(0).toUpperCase();

  if (firstNameInitial && lastNameInitial) {
    return `${firstNameInitial}${lastNameInitial}`;
  }

  if (firstNameInitial) {
    return firstNameInitial;
  }

  if (lastNameInitial) {
    return lastNameInitial;
  }

  const emailInitial = (profile?.email?.trim() ?? user.value?.email?.trim() ?? '')
    .charAt(0)
    .toUpperCase();

  return emailInitial || '?';
});

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
