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
.landing-page {
  --landing-bg-base: rgb(2 7 20);
  --landing-surface-base: rgb(7 14 32 / 82%);
  --landing-border-soft: rgb(100 116 139 / 14%);
  --landing-border-strong: rgb(148 163 184 / 16%);
  --landing-card-bg: rgb(10 18 38 / 72%);
  --landing-card-border: rgb(148 163 184 / 12%);

  min-height: 100vh;
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  color-scheme: dark;
  background: var(--landing-bg-base);
  color: rgb(226 232 240);
  font-family: Manrope, 'Segoe UI', sans-serif;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(72% 48% at 14% 8%, rgb(14 165 233 / 22%), transparent 70%),
      radial-gradient(56% 40% at 86% 16%, rgb(16 185 129 / 16%), transparent 74%),
      radial-gradient(62% 46% at 52% 92%, rgb(37 99 235 / 12%), transparent 80%);
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: Sora, Manrope, sans-serif;
    letter-spacing: -0.02em;
  }

  &__main {
    position: relative;

    > section {
      position: relative;
      background: transparent;
    }
  }

  .landing-surface-card {
    border: 1px solid var(--landing-card-border);
    background: linear-gradient(160deg, rgb(14 23 48 / 74%), var(--landing-card-bg));
    backdrop-filter: blur(6px);
    box-shadow: 0 14px 30px rgb(2 6 23 / 16%);
    transition:
      border-color 180ms ease,
      transform 180ms ease;

    &:hover {
      border-color: rgb(125 211 252 / 34%);
    }
  }
}
</style>
