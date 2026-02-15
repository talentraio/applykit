<template>
  <section class="landing-hero relative pb-20 pt-36 lg:pb-28">
    <UContainer class="landing-hero__container relative flex justify-center">
      <div class="landing-hero__content mx-auto space-y-8 text-center">
        <UBadge color="info" variant="soft" size="lg" class="landing-hero__badge mx-auto">
          {{ $t('landing.hero.badge') }}
        </UBadge>

        <div class="space-y-5">
          <h1
            class="landing-hero__title max-w-4xl text-4xl font-bold leading-tight text-slate-100 md:text-5xl lg:text-6xl"
          >
            {{ $t('landing.hero.title') }}
          </h1>
          <p class="landing-hero__subtitle mx-auto max-w-3xl text-lg text-slate-300 md:text-xl">
            {{ $t('landing.hero.subtitle') }}
          </p>
        </div>

        <div class="landing-hero__actions flex flex-col justify-center gap-3 sm:flex-row">
          <UButton size="xl" color="primary" icon="i-lucide-rocket" @click="handlePrimaryCta">
            {{ $t('landing.hero.primaryCta') }}
          </UButton>
          <UButton
            size="xl"
            color="neutral"
            variant="outline"
            icon="i-lucide-play"
            @click="scrollToFlow"
          >
            {{ $t('landing.hero.secondaryCta') }}
          </UButton>
        </div>

        <div class="landing-hero__meta mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
          <div
            v-for="item in metaItems"
            :key="item.label"
            class="landing-hero__meta-item landing-surface-card rounded-xl p-3 text-left"
          >
            <p class="text-xs uppercase tracking-[0.14em] text-slate-400">{{ item.label }}</p>
            <p class="mt-1 text-lg font-semibold text-slate-100">{{ item.value }}</p>
          </div>
        </div>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingHero' });

const { t } = useI18n();
const { loggedIn } = useAuth();
const { open: openAuthModal } = useAuthModal();
const { redirects } = useAppConfig();

const metaItems = computed(() => [
  { label: t('landing.hero.meta.oneLabel'), value: t('landing.hero.meta.oneValue') },
  { label: t('landing.hero.meta.twoLabel'), value: t('landing.hero.meta.twoValue') },
  { label: t('landing.hero.meta.threeLabel'), value: t('landing.hero.meta.threeValue') }
]);

const handlePrimaryCta = () => {
  if (loggedIn.value) {
    navigateTo(redirects.afterLandingTryIt);
    return;
  }

  openAuthModal('login', redirects.afterLandingTryIt);
};

const scrollToFlow = () => {
  const node = document.getElementById('landing-flow');
  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<style lang="scss">
.landing-hero {
  &__container {
    max-width: 1260px;
  }

  &__content {
    max-width: 760px;
  }

  &__badge {
    width: fit-content;
  }
}
</style>
