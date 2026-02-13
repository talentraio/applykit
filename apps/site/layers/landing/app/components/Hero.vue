<template>
  <section class="landing-hero relative overflow-hidden pb-20 pt-36 lg:pb-28">
    <div class="landing-hero__bg-glow landing-hero__bg-glow--primary" aria-hidden="true" />
    <div class="landing-hero__bg-glow landing-hero__bg-glow--secondary" aria-hidden="true" />

    <UContainer class="landing-hero__container relative">
      <div class="landing-hero__content space-y-8">
        <UBadge color="info" variant="soft" size="lg" class="landing-hero__badge">
          {{ $t('landing.hero.badge') }}
        </UBadge>

        <div class="space-y-5">
          <h1
            class="landing-hero__title max-w-4xl text-4xl font-bold leading-tight text-slate-100 md:text-5xl lg:text-6xl"
          >
            {{ $t('landing.hero.title') }}
          </h1>
          <p class="landing-hero__subtitle max-w-3xl text-lg text-slate-300 md:text-xl">
            {{ $t('landing.hero.subtitle') }}
          </p>
        </div>

        <div class="landing-hero__actions flex flex-col gap-3 sm:flex-row">
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

        <div class="landing-hero__meta grid gap-3 sm:grid-cols-3">
          <div
            v-for="item in metaItems"
            :key="item.label"
            class="landing-hero__meta-item rounded-xl border border-white/10 bg-white/5 p-3"
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
  background:
    radial-gradient(circle at 16% 18%, rgb(6 182 212 / 32%), transparent 40%),
    radial-gradient(circle at 82% 80%, rgb(16 185 129 / 16%), transparent 44%),
    linear-gradient(180deg, rgb(5 12 30), rgb(8 16 38));
  border-bottom: 1px solid var(--landing-border-strong);

  &__container {
    max-width: 1260px;
  }

  &__content {
    max-width: 760px;
  }

  &__bg-glow {
    pointer-events: none;
    position: absolute;
    border-radius: 9999px;
    filter: blur(64px);

    &--primary {
      left: -120px;
      top: 80px;
      height: 320px;
      width: 320px;
      background: rgb(34 211 238 / 25%);
    }

    &--secondary {
      bottom: -120px;
      right: -80px;
      height: 280px;
      width: 280px;
      background: rgb(16 185 129 / 20%);
    }
  }

  &__badge {
    width: fit-content;
  }
}
</style>
