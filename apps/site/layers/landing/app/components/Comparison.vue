<template>
  <section id="landing-dual" class="landing-comparison py-16 lg:py-24">
    <UContainer class="landing-comparison__container">
      <div class="mb-10 space-y-3 text-center">
        <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
          {{ $t('landing.dual.label') }}
        </p>
        <h2 class="text-3xl font-bold text-slate-100 lg:text-4xl">
          {{ $t('landing.dual.title') }}
        </h2>
        <p class="mx-auto max-w-3xl text-slate-300">{{ $t('landing.dual.subtitle') }}</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard class="landing-comparison__card border border-white/12 bg-white/[0.03]">
          <template #header>
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/20 text-cyan-200"
              >
                <UIcon name="i-lucide-file-text" class="text-lg" />
              </span>
              <h3 class="text-2xl font-semibold text-slate-100">
                {{ $t('landing.dual.ats.title') }}
              </h3>
            </div>
          </template>

          <ul class="space-y-3 text-slate-300">
            <li v-for="item in atsPoints" :key="item" class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="mt-1 text-cyan-300" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </UCard>

        <UCard class="landing-comparison__card border border-white/12 bg-white/[0.03]">
          <template #header>
            <div class="flex items-center gap-3">
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-300/20 text-emerald-200"
              >
                <UIcon name="i-lucide-brain-circuit" class="text-lg" />
              </span>
              <h3 class="text-2xl font-semibold text-slate-100">
                {{ $t('landing.dual.human.title') }}
              </h3>
            </div>
          </template>

          <ul class="space-y-3 text-slate-300">
            <li v-for="item in humanPoints" :key="item" class="flex items-start gap-2">
              <UIcon name="i-lucide-check" class="mt-1 text-emerald-300" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </UCard>
      </div>

      <UCard class="landing-comparison__source mt-6 border border-cyan-200/30 bg-cyan-500/10">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-cyan-100">
              {{ $t('landing.dual.singleSourceLabel') }}
            </p>
            <p class="mt-1 text-base font-semibold text-slate-100">
              {{ $t('landing.dual.singleSourceTitle') }}
            </p>
          </div>
          <UBadge color="info" variant="soft" size="lg">{{
            $t('landing.dual.singleSourceBadge')
          }}</UBadge>
        </div>
      </UCard>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingComparison' });

const { t } = useI18n();

const atsPoints = computed(() => [
  t('landing.dual.ats.point1'),
  t('landing.dual.ats.point2'),
  t('landing.dual.ats.point3')
]);

const humanPoints = computed(() => [
  t('landing.dual.human.point1'),
  t('landing.dual.human.point2'),
  t('landing.dual.human.point3')
]);
</script>

<style lang="scss">
.landing-comparison {
  background: var(--landing-surface-2);
  border-top: 1px solid var(--landing-border-strong);

  &__container {
    max-width: 1260px;
  }
}
</style>
