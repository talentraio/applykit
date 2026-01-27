<template>
  <section class="landing-comparison">
    <div class="landing-comparison__container container mx-auto px-4 py-16 lg:py-24">
      <h2 class="landing-comparison__title text-3xl lg:text-4xl font-bold text-center mb-4">
        {{ $t('landing.comparison.title') }}
      </h2>
      <p
        class="landing-comparison__subtitle text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto"
      >
        {{ $t('landing.comparison.subtitle') }}
      </p>

      <div class="landing-comparison__grid grid gap-8 lg:grid-cols-2">
        <!-- ATS Column -->
        <div
          class="landing-comparison__column bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
        >
          <h3
            class="landing-comparison__column-title text-2xl font-semibold mb-6 flex items-center gap-3"
          >
            <UIcon name="i-lucide-file-text" class="text-gray-600 dark:text-gray-400" />
            {{ $t('landing.comparison.ats.title') }}
          </h3>
          <ul class="landing-comparison__list space-y-4">
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.ats.point1')
              }}</span>
            </li>
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.ats.point2')
              }}</span>
            </li>
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.ats.point3')
              }}</span>
            </li>
          </ul>
        </div>

        <!-- Human Column -->
        <div
          class="landing-comparison__column bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700"
        >
          <h3
            class="landing-comparison__column-title text-2xl font-semibold mb-6 flex items-center gap-3"
          >
            <UIcon name="i-lucide-user" class="text-violet-600 dark:text-violet-400" />
            {{ $t('landing.comparison.human.title') }}
          </h3>
          <ul class="landing-comparison__list space-y-4">
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.human.point1')
              }}</span>
            </li>
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.human.point2')
              }}</span>
            </li>
            <li class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check"
                class="text-violet-600 dark:text-violet-400 mt-1 flex-shrink-0"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                $t('landing.comparison.human.point3')
              }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Landing Comparison Component
 *
 * ATS vs Human resume comparison section
 * Per docs/architecture/homepage.md
 *
 * T153 [Phase 12] Landing page comparison section
 */

defineOptions({ name: 'LandingComparison' });
</script>
