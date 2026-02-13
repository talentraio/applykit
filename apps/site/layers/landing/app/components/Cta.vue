<template>
  <section class="landing-cta pb-20 pt-6 lg:pb-24">
    <UContainer class="landing-cta__container">
      <UCard class="landing-cta__card border border-cyan-200/25 bg-slate-950 text-white shadow-2xl">
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
            <UButton
              size="xl"
              color="neutral"
              variant="outline"
              @click="openAuthModal('login', redirects.afterLandingTryIt)"
            >
              {{ $t('landing.cta.secondary') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingCta' });

const { loggedIn } = useAuth();
const { open: openAuthModal } = useAuthModal();
const { redirects } = useAppConfig();

const handlePrimaryCta = () => {
  if (loggedIn.value) {
    navigateTo(redirects.afterLandingTryIt);
    return;
  }

  openAuthModal('login', redirects.afterLandingTryIt);
};
</script>

<style lang="scss">
.landing-cta {
  background: var(--landing-surface-2);
  border-top: 1px solid var(--landing-border-strong);

  &__container {
    max-width: 1260px;
  }

  &__card {
    background:
      radial-gradient(circle at 85% 10%, rgb(6 182 212 / 25%), transparent 34%),
      radial-gradient(circle at 12% 80%, rgb(16 185 129 / 20%), transparent 38%), rgb(2 6 23);
  }
}
</style>
