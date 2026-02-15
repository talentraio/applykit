<template>
  <section class="landing-modes py-16 lg:py-20">
    <UContainer class="landing-modes__container">
      <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <UCard class="landing-surface-card" :ui="{ root: 'divide-y-0' }">
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

          <div class="landing-modes__preview-content p-1">
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

            <ul class="space-y-2">
              <li
                v-for="line in previewLines"
                :key="line"
                class="landing-modes__line rounded-md px-3 py-2 text-sm text-slate-300"
              >
                {{ line }}
              </li>
            </ul>
          </div>
        </UCard>

        <div class="grid gap-4">
          <UCard
            class="landing-modes__metric landing-modes__metric--score"
            :ui="{ root: 'divide-y-0' }"
          >
            <p class="text-xs uppercase tracking-[0.12em] text-emerald-200">
              {{ $t('landing.hero.floating.scoreLabel') }}
            </p>
            <p class="mt-1 text-3xl font-bold text-emerald-100">+28%</p>
          </UCard>

          <UCard
            class="landing-modes__metric landing-modes__metric--time"
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
  &__container {
    max-width: 1260px;
  }

  &__metric {
    border: 1px solid var(--landing-card-border);
    backdrop-filter: blur(4px);
    box-shadow:
      inset 0 1px 0 rgb(248 250 252 / 4%),
      0 14px 30px rgb(2 6 23 / 20%);

    &--score {
      background: linear-gradient(160deg, rgb(6 95 70 / 24%), rgb(6 78 59 / 14%));
    }

    &--time {
      background: linear-gradient(160deg, rgb(8 47 73 / 25%), rgb(12 74 110 / 13%));
    }
  }

  &__preview-content {
    background: transparent;
  }

  &__line {
    border: 1px solid rgb(148 163 184 / 14%);
    border-left: 2px solid rgb(34 211 238 / 24%);
    background: rgb(15 23 42 / 28%);
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
