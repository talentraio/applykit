<template>
  <section class="landing-cta pb-20 pt-6 lg:pb-24">
    <UContainer class="landing-cta__container">
      <UCard class="landing-cta__card landing-surface-card text-white">
        <div class="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
              {{ $t('landing.cta.label') }}
            </p>
            <h2 class="mt-3 text-3xl font-bold lg:text-4xl">{{ $t('landing.cta.title') }}</h2>
            <p class="mt-3 max-w-2xl text-slate-300">{{ $t('landing.cta.subtitle') }}</p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <UButton size="xl" color="primary" icon="i-lucide-rocket" @click="handlePrimaryCta">
              {{ $t('landing.cta.primary') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingCta' });

const { loggedIn, openAuthModal } = useAuth();
const { redirects } = useAppConfig();

const handlePrimaryCta = () => {
  if (loggedIn.value) {
    navigateTo(redirects.auth.landingTryIt);
    return;
  }

  openAuthModal('login', redirects.auth.landingTryIt);
};
</script>

<style lang="scss">
.landing-cta {
  &__container {
    max-width: 1260px;
  }

  &__card {
    background:
      radial-gradient(circle at 86% 10%, rgb(6 182 212 / 16%), transparent 36%),
      radial-gradient(circle at 12% 80%, rgb(16 185 129 / 12%), transparent 40%),
      linear-gradient(150deg, rgb(2 6 23 / 86%), rgb(3 12 28 / 78%));
  }
}
</style>
