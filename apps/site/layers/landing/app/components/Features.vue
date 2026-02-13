<template>
  <section id="landing-features" class="landing-features py-16 lg:py-24">
    <UContainer class="landing-features__container">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
          {{ $t('landing.features.label') }}
        </p>
        <h2 class="text-3xl font-bold text-slate-100 lg:text-4xl">
          {{ $t('landing.features.title') }}
        </h2>
        <p class="mx-auto max-w-3xl text-slate-300">{{ $t('landing.features.subtitle') }}</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UCard
          v-for="feature in features"
          :key="feature.key"
          class="landing-features__card border border-white/10 bg-white/[0.03] shadow-sm transition-transform duration-200 hover:-translate-y-1"
        >
          <div
            class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200"
          >
            <UIcon :name="feature.icon" class="text-lg" />
          </div>
          <h3 class="text-lg font-semibold text-slate-100">{{ feature.title }}</h3>
          <p class="mt-2 text-sm text-slate-300">{{ feature.description }}</p>
        </UCard>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingFeatures' });

const { t } = useI18n();

const features = computed(() => [
  {
    key: 'parse',
    icon: 'i-lucide-file-search',
    title: t('landing.features.items.parse.title'),
    description: t('landing.features.items.parse.description')
  },
  {
    key: 'rewrite',
    icon: 'i-lucide-pen-line',
    title: t('landing.features.items.rewrite.title'),
    description: t('landing.features.items.rewrite.description')
  },
  {
    key: 'score',
    icon: 'i-lucide-bar-chart-3',
    title: t('landing.features.items.score.title'),
    description: t('landing.features.items.score.description')
  },
  {
    key: 'versions',
    icon: 'i-lucide-history',
    title: t('landing.features.items.versions.title'),
    description: t('landing.features.items.versions.description')
  },
  {
    key: 'formats',
    icon: 'i-lucide-file-output',
    title: t('landing.features.items.formats.title'),
    description: t('landing.features.items.formats.description')
  },
  {
    key: 'limits',
    icon: 'i-lucide-shield-check',
    title: t('landing.features.items.limits.title'),
    description: t('landing.features.items.limits.description')
  }
]);
</script>

<style lang="scss">
.landing-features {
  background: var(--landing-surface-1);
  border-top: 1px solid var(--landing-border-soft);

  &__container {
    max-width: 1260px;
  }
}
</style>
