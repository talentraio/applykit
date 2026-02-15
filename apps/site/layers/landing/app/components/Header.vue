<template>
  <header class="landing-header fixed inset-x-0 top-0 z-40">
    <UContainer class="landing-header__container">
      <div
        class="landing-header__bar mt-4 flex items-center justify-between rounded-2xl border border-white/20 bg-slate-950/70 px-4 py-3 backdrop-blur-xl"
      >
        <button
          class="landing-header__brand flex items-center gap-3"
          type="button"
          @click="scrollToTop"
        >
          <NuxtImg
            src="/img/logo.png"
            format="webp"
            alt="ApplyKit"
            class="landing-header__logo h-7 w-auto md:h-8"
          />
        </button>

        <nav class="landing-header__nav hidden items-center gap-2 lg:flex">
          <button
            v-for="item in navItems"
            :key="item.id"
            class="landing-header__nav-link rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            type="button"
            @click="scrollTo(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="landing-header__actions flex items-center gap-2">
          <UButton
            v-if="loggedIn"
            color="primary"
            size="sm"
            icon="i-lucide-rocket"
            @click="navigateTo(redirects.afterLandingTryIt)"
          >
            {{ $t('landing.header.goTailoring') }}
          </UButton>

          <UButton
            v-else
            size="sm"
            color="neutral"
            variant="outline"
            @click="openAuthModal('login', redirects.afterLandingTryIt)"
          >
            {{ $t('landing.header.signIn') }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </header>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingHeader' });

const { t } = useI18n();
const { loggedIn } = useAuth();
const { open: openAuthModal } = useAuthModal();
const { redirects } = useAppConfig();

const navItems = computed(() => [
  { id: 'landing-flow', label: t('landing.header.nav.flow') },
  { id: 'landing-features', label: t('landing.header.nav.features') },
  { id: 'landing-dual', label: t('landing.header.nav.dual') },
  { id: 'landing-faq', label: t('landing.header.nav.faq') }
]);

const scrollTo = (id: string) => {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<style lang="scss">
.landing-header {
  &__container {
    max-width: 1260px;
  }

  &__brand {
    &:focus-visible {
      outline: 2px solid rgb(34 211 238 / 70%);
      outline-offset: 2px;
    }
  }

  &__nav-link {
    background: transparent;
  }

  &__logo {
    display: block;
    object-fit: contain;
  }
}
</style>
