<template>
  <section id="landing-flow" class="landing-flow py-16 lg:py-24">
    <UContainer class="landing-flow__container">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
          {{ $t('landing.flow.label') }}
        </p>
        <h2 class="text-3xl font-bold text-slate-100 lg:text-4xl">
          {{ $t('landing.flow.title') }}
        </h2>
        <p class="mx-auto max-w-3xl text-slate-300">{{ $t('landing.flow.subtitle') }}</p>
      </div>

      <div class="landing-flow__grid grid gap-4 lg:grid-cols-4">
        <UCard
          v-for="step in steps"
          :key="step.key"
          class="landing-flow__card landing-surface-card"
        >
          <div class="mb-4 flex items-center justify-between">
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/15 text-sm font-semibold text-cyan-100"
            >
              {{ step.index }}
            </span>
            <UIcon :name="step.icon" class="text-xl text-emerald-300" />
          </div>

          <h3 class="text-lg font-semibold text-slate-100">{{ step.title }}</h3>
          <p class="mt-2 text-sm text-slate-300">{{ step.description }}</p>
        </UCard>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingFlow' });

const { t } = useI18n();

const steps = computed(() => [
  {
    key: 'upload',
    index: '01',
    icon: 'i-lucide-upload-cloud',
    title: t('landing.flow.steps.upload.title'),
    description: t('landing.flow.steps.upload.description')
  },
  {
    key: 'target',
    index: '02',
    icon: 'i-lucide-crosshair',
    title: t('landing.flow.steps.target.title'),
    description: t('landing.flow.steps.target.description')
  },
  {
    key: 'adapt',
    index: '03',
    icon: 'i-lucide-sparkles',
    title: t('landing.flow.steps.adapt.title'),
    description: t('landing.flow.steps.adapt.description')
  },
  {
    key: 'export',
    index: '04',
    icon: 'i-lucide-file-down',
    title: t('landing.flow.steps.export.title'),
    description: t('landing.flow.steps.export.description')
  }
]);
</script>

<style lang="scss">
.landing-flow {
  &__container {
    max-width: 1260px;
  }
}
</style>
