<template>
  <section class="landing-metrics bg-gray-50 dark:bg-gray-900">
    <div class="landing-metrics__container container mx-auto px-4 py-16 lg:py-24">
      <h2 class="landing-metrics__title text-3xl lg:text-4xl font-bold text-center mb-12">
        {{ $t('landing.metrics.title') }}
      </h2>

      <div class="landing-metrics__grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="metric in metrics"
          :key="metric.key"
          class="landing-metrics__card bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
        >
          <div
            class="landing-metrics__icon-wrapper flex items-center justify-center w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 mb-4"
          >
            <UIcon :name="metric.icon" class="text-violet-600 dark:text-violet-400 text-2xl" />
          </div>
          <div
            class="landing-metrics__value text-3xl font-bold text-violet-600 dark:text-violet-400 mb-2"
          >
            {{ metric.value }}
          </div>
          <div class="landing-metrics__label text-gray-600 dark:text-gray-400">
            {{ metric.label }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Landing Metrics Component
 *
 * Static metric tiles (placeholders for MVP)
 * Per docs/architecture/homepage.md
 *
 * T153 [Phase 12] Landing page metrics section
 */

defineOptions({ name: 'LandingMetrics' });

const { t } = useI18n();

const metrics = computed(() => [
  {
    key: 'vacanciesTracked',
    icon: 'i-lucide-briefcase',
    label: t('landing.metrics.vacanciesTracked'),
    value: t('landing.metrics.placeholder.vacanciesTracked')
  },
  {
    key: 'resumesGenerated',
    icon: 'i-lucide-file-check',
    label: t('landing.metrics.resumesGenerated'),
    value: t('landing.metrics.placeholder.resumesGenerated')
  },
  {
    key: 'avgMatchScore',
    icon: 'i-lucide-target',
    label: t('landing.metrics.avgMatchScore'),
    value: t('landing.metrics.placeholder.avgMatchScore')
  },
  {
    key: 'bestMatchScore',
    icon: 'i-lucide-award',
    label: t('landing.metrics.bestMatchScore'),
    value: t('landing.metrics.placeholder.bestMatchScore')
  },
  {
    key: 'timeSaved',
    icon: 'i-lucide-clock',
    label: t('landing.metrics.timeSaved'),
    value: t('landing.metrics.placeholder.timeSaved')
  },
  {
    key: 'lastGeneration',
    icon: 'i-lucide-calendar',
    label: t('landing.metrics.lastGeneration'),
    value: t('landing.metrics.placeholder.lastGeneration')
  }
]);
</script>
