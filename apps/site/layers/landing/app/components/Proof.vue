<template>
  <section id="landing-proof" class="landing-proof py-16 lg:py-20">
    <UContainer class="landing-proof__container">
      <div class="landing-proof__grid grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <UCard class="landing-proof__story border border-white/10 bg-white/[0.03] shadow-sm">
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

          <div class="grid gap-3 sm:grid-cols-3">
            <div
              v-for="metric in metrics"
              :key="metric.key"
              class="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
            >
              <p class="text-xs uppercase tracking-[0.12em] text-slate-400">{{ metric.label }}</p>
              <p class="mt-1 text-2xl font-bold text-slate-100">{{ metric.value }}</p>
            </div>
          </div>
        </UCard>

        <UCard class="landing-proof__roles border border-white/10 bg-white/[0.03] shadow-sm">
          <template #header>
            <h3 class="text-lg font-semibold text-slate-100">
              {{ $t('landing.proof.rolesTitle') }}
            </h3>
          </template>

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

          <USeparator class="my-5" />

          <p class="text-sm text-slate-300">
            {{ $t('landing.proof.rolesNote') }}
          </p>
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
</script>

<style lang="scss">
.landing-proof {
  background: var(--landing-surface-1);
  border-top: 1px solid var(--landing-border-soft);

  &__container {
    max-width: 1260px;
  }
}
</style>
