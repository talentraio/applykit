<template>
  <div class="landing-page">
    <LandingHeader />

    <main class="landing-page__main">
      <LandingHero />
      <LandingProof />
      <LandingFlow />
      <LandingFeatures />
      <LandingModes />
      <LandingComparison />
      <LandingFaq />
      <LandingCta />
    </main>

    <LandingFooter />

    <AuthModal />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingPage' });

definePageMeta({
  layout: false,
  colorMode: 'dark'
});
</script>

<style lang="scss">
@import 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap';

.landing-page {
  --landing-bg-base: rgb(4 10 25);
  --landing-surface-1: rgb(8 16 38);
  --landing-surface-2: rgb(10 20 46);
  --landing-surface-3: rgb(12 24 54);
  --landing-border-soft: rgb(51 65 85 / 62%);
  --landing-border-strong: rgb(71 85 105 / 75%);

  min-height: 100vh;
  color-scheme: dark;
  background:
    radial-gradient(circle at 16% 8%, rgb(8 145 178 / 16%), transparent 32%),
    radial-gradient(circle at 84% 20%, rgb(14 116 144 / 18%), transparent 34%),
    linear-gradient(180deg, rgb(3 9 25), rgb(4 10 25));
  color: rgb(226 232 240);
  font-family: Manrope, 'Segoe UI', sans-serif;

  h1,
  h2,
  h3,
  h4 {
    font-family: Sora, Manrope, sans-serif;
    letter-spacing: -0.02em;
  }

  &__main {
    position: relative;
  }
}
</style>
