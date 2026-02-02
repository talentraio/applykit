<template>
  <section class="landing-hero">
    <div class="landing-hero__container container mx-auto px-4 py-16 lg:py-24">
      <div class="landing-hero__grid grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
        <!-- Left: Content -->
        <div class="landing-hero__content">
          <h1 class="landing-hero__headline text-4xl lg:text-6xl font-bold mb-6">
            {{ $t('landing.hero.headline') }}
          </h1>
          <p
            class="landing-hero__subheadline text-lg lg:text-xl text-gray-600 dark:text-gray-400 mb-8"
          >
            {{ $t('landing.hero.subheadline') }}
          </p>

          <div class="landing-hero__actions flex flex-col sm:flex-row gap-4 mb-4">
            <UButton
              size="xl"
              color="primary"
              icon="i-lucide-rocket"
              :label="$t('landing.hero.ctaPrimary')"
              @click="handleTryIt"
            />
            <UButton
              size="xl"
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-down"
              :label="$t('landing.hero.ctaSecondary')"
              @click="scrollToSteps"
            />
          </div>

          <p class="landing-hero__disclaimer text-sm text-gray-500 dark:text-gray-500">
            {{ $t('landing.hero.disclaimer') }}
          </p>
        </div>

        <!-- Right: Visual -->
        <div class="landing-hero__visual">
          <div
            class="landing-hero__preview-card relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl"
          >
            <div class="landing-hero__split grid grid-cols-2 gap-4">
              <!-- ATS Preview -->
              <div class="landing-hero__ats-preview">
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">ATS</div>
                <div class="space-y-2">
                  <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                  <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                  <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                </div>
              </div>

              <!-- Human Preview -->
              <div class="landing-hero__human-preview">
                <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Human</div>
                <div class="space-y-2">
                  <div class="h-3 bg-violet-200 dark:bg-violet-900 rounded w-full" />
                  <div class="h-3 bg-violet-200 dark:bg-violet-900 rounded w-3/4" />
                  <div class="h-3 bg-violet-200 dark:bg-violet-900 rounded w-full" />
                  <div class="h-3 bg-violet-200 dark:bg-violet-900 rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Landing Hero Component
 *
 * Main hero section with headline, CTAs, and split preview visual
 * Per docs/architecture/homepage.md
 *
 * T153 [Phase 12] Landing page hero section
 */

defineOptions({ name: 'LandingHero' });

const { loggedIn } = useAuth();
const { open: openAuthModal } = useAuthModal();

/**
 * Handle "Try it" button click
 * - If logged in: navigate to /resume
 * - If not logged in: open auth modal with redirect to /resume
 */
const handleTryIt = () => {
  if (loggedIn.value) {
    navigateTo('/resume');
  } else {
    openAuthModal('login', '/resume');
  }
};

const scrollToSteps = () => {
  const stepsSection = document.querySelector('.landing-steps');
  if (stepsSection) {
    stepsSection.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>
