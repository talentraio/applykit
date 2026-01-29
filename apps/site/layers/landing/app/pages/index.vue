<template>
  <div class="landing-page">
    <LandingHero />
    <LandingSteps />
    <LandingComparison />
    <LandingMetrics />
    <LandingFaq />
    <AppFooter />

    <!-- Auth Modal for "Try it" button -->
    <AuthModalAuthModal />
  </div>
</template>

<script setup lang="ts">
/**
 * Landing Page
 *
 * Main marketing homepage with all sections
 * Per docs/architecture/homepage.md and docs/design/mvp.md
 *
 * Sections (in order):
 * 1. Hero (headline, subheadline, CTAs, visual)
 * 2. Steps (4-step process)
 * 3. ATS vs Human comparison
 * 4. Metric tiles (static placeholders for MVP)
 * 5. FAQ
 * 6. Footer
 *
 * T153 [Phase 12] Landing page with marketing content
 */

defineOptions({ name: 'LandingPage' });

definePageMeta({
  layout: false // Use custom layout for landing page
});
</script>

<style lang="scss">
.landing-page {
  min-height: 100vh;
}
</style>
