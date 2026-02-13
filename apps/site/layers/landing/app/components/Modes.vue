<template>
  <section class="landing-modes py-16 lg:py-20">
    <UContainer class="landing-modes__container">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <UCard
          class="border border-white/10 bg-white/[0.03] shadow-sm"
          :ui="{ root: 'divide-y-0' }"
        >
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.12em] text-slate-400">
                  {{ $t('landing.hero.previewLabel') }}
                </p>
                <p class="mt-1 text-base font-semibold text-slate-100">
                  {{ $t('landing.hero.previewTitle') }}
                </p>
              </div>

              <div class="inline-flex rounded-lg border border-white/10 bg-slate-900/60 p-1">
                <button
                  v-for="option in previewOptions"
                  :key="option.id"
                  type="button"
                  class="landing-modes__preview-button rounded-md px-3 py-1.5 text-sm"
                  :class="
                    previewMode === option.id
                      ? 'landing-modes__preview-button--active'
                      : 'text-slate-400'
                  "
                  @click="previewMode = option.id"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </template>

          <div class="rounded-2xl border border-white/10 bg-slate-900/65 p-5">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-100">Alex Morgan</p>
                <p class="text-xs text-slate-400">{{ $t('landing.hero.previewRole') }}</p>
              </div>
              <UBadge
                :color="previewMode === 'ats' ? 'primary' : 'success'"
                variant="soft"
                size="sm"
              >
                {{
                  previewMode === 'ats'
                    ? $t('landing.hero.previewAts')
                    : $t('landing.hero.previewHuman')
                }}
              </UBadge>
            </div>

            <ul class="space-y-2.5">
              <li
                v-for="line in previewLines"
                :key="line"
                class="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300"
              >
                {{ line }}
              </li>
            </ul>
          </div>
        </UCard>

        <div class="grid gap-4">
          <UCard
            class="border border-emerald-300/25 bg-emerald-500/10 shadow-sm"
            :ui="{ root: 'divide-y-0' }"
          >
            <p class="text-xs uppercase tracking-[0.12em] text-emerald-200">
              {{ $t('landing.hero.floating.scoreLabel') }}
            </p>
            <p class="mt-1 text-3xl font-bold text-emerald-100">+28%</p>
          </UCard>

          <UCard
            class="border border-cyan-300/25 bg-cyan-500/10 shadow-sm"
            :ui="{ root: 'divide-y-0' }"
          >
            <p class="text-xs uppercase tracking-[0.12em] text-cyan-200">
              {{ $t('landing.hero.floating.timeLabel') }}
            </p>
            <p class="mt-1 text-xl font-semibold text-cyan-100">
              {{ $t('landing.hero.floating.timeValue') }}
            </p>
          </UCard>
        </div>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingModes' });

type PreviewMode = 'ats' | 'human';

const { t } = useI18n();

const previewMode = ref<PreviewMode>('ats');

const previewOptions = computed(() => [
  { id: 'ats' as const, label: t('landing.hero.previewAts') },
  { id: 'human' as const, label: t('landing.hero.previewHuman') }
]);

const previewLines = computed(() => {
  if (previewMode.value === 'ats') {
    return [
      t('landing.hero.previewAtsLine1'),
      t('landing.hero.previewAtsLine2'),
      t('landing.hero.previewAtsLine3')
    ];
  }

  return [
    t('landing.hero.previewHumanLine1'),
    t('landing.hero.previewHumanLine2'),
    t('landing.hero.previewHumanLine3')
  ];
});
</script>

<style lang="scss">
.landing-modes {
  background: var(--landing-surface-1);
  border-top: 1px solid var(--landing-border-soft);

  &__container {
    max-width: 1260px;
  }

  &__preview-button {
    transition: all 180ms ease;

    &--active {
      background: rgb(34 211 238 / 18%);
      color: rgb(165 243 252);
      box-shadow: inset 0 0 0 1px rgb(34 211 238 / 35%);
    }
  }
}
</style>
