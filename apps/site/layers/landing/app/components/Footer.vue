<template>
  <footer class="landing-footer border-t border-slate-800 bg-slate-950 py-10">
    <UContainer class="landing-footer__container">
      <div class="grid gap-8 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200"
            >
              <UIcon name="i-lucide-sparkles" class="text-lg" />
            </span>
            <div>
              <p class="text-sm font-semibold tracking-[0.12em] text-cyan-100">APPLYKIT</p>
              <p class="text-xs text-slate-400">Resume Intelligence</p>
            </div>
          </div>
          <p class="max-w-sm text-sm text-slate-400">{{ $t('landing.footer.description') }}</p>
        </div>

        <div>
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">
            {{ $t('landing.footer.product') }}
          </p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <button type="button" class="landing-footer__link" @click="scrollTo('landing-flow')">
                {{ $t('landing.footer.flow') }}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="landing-footer__link"
                @click="scrollTo('landing-features')"
              >
                {{ $t('landing.footer.features') }}
              </button>
            </li>
            <li>
              <button type="button" class="landing-footer__link" @click="scrollTo('landing-dual')">
                {{ $t('landing.footer.dual') }}
              </button>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">
            {{ $t('landing.footer.legal') }}
          </p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <ULink to="/privacy" class="landing-footer__link">{{
                $t('landing.footer.privacy')
              }}</ULink>
            </li>
            <li>
              <ULink to="/terms" class="landing-footer__link">{{
                $t('landing.footer.terms')
              }}</ULink>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">
            {{ $t('landing.footer.account') }}
          </p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <ULink to="/login" class="landing-footer__link">{{
                $t('landing.footer.login')
              }}</ULink>
            </li>
            <li>
              <ULink to="/resume" class="landing-footer__link">{{
                $t('landing.footer.resume')
              }}</ULink>
            </li>
            <li>
              <ULink to="/vacancies" class="landing-footer__link">{{
                $t('landing.footer.vacancies')
              }}</ULink>
            </li>
          </ul>
        </div>
      </div>

      <USeparator class="my-8" />

      <div
        class="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>{{ $t('landing.footer.copyright', { year: currentYear }) }}</p>
        <p>{{ $t('landing.footer.tagline') }}</p>
      </div>
    </UContainer>
  </footer>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingFooter' });

const currentYear = new Date().getFullYear();

const scrollTo = (id: string) => {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<style lang="scss">
.landing-footer {
  &__container {
    max-width: 1260px;
  }

  &__link {
    color: rgb(203 213 225);
    transition: color 180ms ease;

    &:hover {
      color: rgb(103 232 249);
    }
  }
}
</style>
