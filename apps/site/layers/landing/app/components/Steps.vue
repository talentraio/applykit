<template>
  <section class="landing-steps bg-gray-50 dark:bg-gray-900">
    <div class="landing-steps__container container mx-auto px-4 py-16 lg:py-24">
      <h2 class="landing-steps__title text-3xl lg:text-4xl font-bold text-center mb-12">
        {{ $t('landing.steps.title') }}
      </h2>

      <div class="landing-steps__grid grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="landing-steps__card bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
        >
          <div
            class="landing-steps__icon-wrapper flex items-center justify-center w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 mb-4"
          >
            <UIcon :name="step.icon" class="text-violet-600 dark:text-violet-400 text-2xl" />
          </div>
          <h3 class="landing-steps__card-title text-xl font-semibold mb-2">
            {{ step.title }}
          </h3>
          <p class="landing-steps__card-description text-gray-600 dark:text-gray-400">
            {{ step.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Landing Steps Component
 *
 * Shows 4-step process cards
 * Per docs/architecture/homepage.md
 *
 * T153 [Phase 12] Landing page steps section
 */

defineOptions({ name: 'LandingSteps' });

const { t } = useI18n();

const steps = computed(() => [
  {
    icon: 'i-lucide-upload',
    title: t('landing.steps.upload.title'),
    description: t('landing.steps.upload.description')
  },
  {
    icon: 'i-lucide-search-check',
    title: t('landing.steps.review.title'),
    description: t('landing.steps.review.description')
  },
  {
    icon: 'i-lucide-briefcase',
    title: t('landing.steps.vacancy.title'),
    description: t('landing.steps.vacancy.description')
  },
  {
    icon: 'i-lucide-download',
    title: t('landing.steps.export.title'),
    description: t('landing.steps.export.description')
  }
]);
</script>
