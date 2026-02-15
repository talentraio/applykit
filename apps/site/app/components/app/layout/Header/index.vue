<template>
  <header class="app-layout-header sticky top-0 z-50 border-b border-default bg-default">
    <div
      class="app-layout-header__content mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-4 lg:px-6"
    >
      <div class="app-layout-header__left flex items-center gap-4">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />

        <NuxtLink to="/" class="app-layout-header__logo text-lg font-semibold">
          {{ appTitle }}
        </NuxtLink>

        <nav class="app-layout-header__nav hidden items-center gap-1 md:flex">
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
const navLinks = useNavLinks();

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
