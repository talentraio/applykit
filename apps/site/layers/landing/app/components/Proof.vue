<template>
  <section id="landing-proof" class="landing-proof py-16 lg:py-20">
    <UContainer class="landing-proof__container">
      <div class="landing-proof__grid grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <UCard class="landing-proof__story landing-surface-card h-full">
          <template #header>
            <div class="space-y-3">
              <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
                {{ $t('landing.proof.label') }}
              </p>
              <h2 class="text-3xl font-bold text-slate-100 lg:text-4xl">
                {{ $t('landing.proof.title') }}
              </h2>
              <p class="text-slate-300">{{ $t('landing.proof.subtitle') }}</p>
            </div>
          </template>

          <div class="flex h-full flex-col">
            <div class="mt-1">
              <p class="text-xs uppercase tracking-[0.12em] text-cyan-300/90">
                {{ $t('landing.features.label') }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <div
                  v-for="item in storyCapabilityItems"
                  :key="item"
                  class="inline-flex items-center gap-2 rounded-full border border-slate-500/18 px-3 py-1.5 text-sm text-slate-200"
                >
                  <UIcon name="i-lucide-check" class="text-xs text-emerald-300" />
                  <span>{{ item }}</span>
                </div>
              </div>
            </div>

            <div class="mt-auto grid gap-3 pt-5 sm:grid-cols-3">
              <div
                v-for="metric in metrics"
                :key="metric.key"
                class="rounded-xl border border-slate-500/22 bg-slate-900/28 px-4 py-3"
              >
                <p class="text-xs uppercase tracking-[0.12em] text-slate-400">{{ metric.label }}</p>
                <p class="mt-1 text-2xl font-bold text-slate-100">{{ metric.value }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="landing-proof__roles landing-surface-card h-full">
          <template #header>
            <h3 class="text-lg font-semibold text-slate-100">
              {{ $t('landing.proof.rolesTitle') }}
            </h3>
          </template>

          <div class="flex h-full flex-col">
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="role in roles"
                :key="role"
                color="neutral"
                variant="outline"
                size="lg"
                class="rounded-full px-3 py-1 text-slate-200"
              >
                {{ role }}
              </UBadge>
            </div>

            <div class="mt-6 rounded-xl border border-slate-500/18 bg-slate-900/24 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.12em] text-cyan-300">
                {{ $t('landing.features.label') }}
              </p>
              <ul class="mt-3 space-y-2.5">
                <li
                  v-for="item in capabilityItems"
                  :key="item.title"
                  class="flex items-start gap-2.5"
                >
                  <UIcon name="i-lucide-check" class="mt-0.5 text-sm text-emerald-300" />
                  <div>
                    <p class="text-sm font-medium text-slate-200">{{ item.title }}</p>
                    <p class="text-xs text-slate-400">{{ item.description }}</p>
                  </div>
                </li>
              </ul>
            </div>

            <div class="mt-auto">
              <USeparator class="my-5" />

              <p class="text-sm text-slate-300">
                {{ $t('landing.proof.rolesNote') }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingProof' });

const { t } = useI18n();

const metrics = computed(() => [
  { key: 'a', label: t('landing.proof.metrics.aLabel'), value: t('landing.proof.metrics.aValue') },
  { key: 'b', label: t('landing.proof.metrics.bLabel'), value: t('landing.proof.metrics.bValue') },
  { key: 'c', label: t('landing.proof.metrics.cLabel'), value: t('landing.proof.metrics.cValue') }
]);

const roles = computed(() => [
  t('landing.proof.roles.one'),
  t('landing.proof.roles.two'),
  t('landing.proof.roles.three'),
  t('landing.proof.roles.four'),
  t('landing.proof.roles.five'),
  t('landing.proof.roles.six')
]);

const capabilityItems = computed(() => [
  {
    title: t('landing.features.items.parse.title'),
    description: t('landing.features.items.parse.description')
  },
  {
    title: t('landing.features.items.rewrite.title'),
    description: t('landing.features.items.rewrite.description')
  },
  {
    title: t('landing.features.items.score.title'),
    description: t('landing.features.items.score.description')
  }
]);

const storyCapabilityItems = computed(() => [
  t('landing.features.items.parse.title'),
  t('landing.features.items.rewrite.title'),
  t('landing.features.items.score.title')
]);
</script>

<style lang="scss">
.landing-proof {
  &__container {
    max-width: 1260px;
  }
}
</style>
