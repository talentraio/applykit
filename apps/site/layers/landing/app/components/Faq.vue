<template>
  <section id="landing-faq" class="landing-faq py-16 lg:py-24">
    <UContainer class="landing-faq__container">
      <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-4">
          <p class="text-xs uppercase tracking-[0.14em] text-cyan-300">
            {{ $t('landing.faq.label') }}
          </p>
          <h2 class="text-3xl font-bold text-slate-100 lg:text-4xl">
            {{ $t('landing.faq.title') }}
          </h2>
          <p class="text-slate-300">{{ $t('landing.faq.subtitle') }}</p>

          <UCard class="landing-surface-card">
            <p class="text-sm text-slate-300">{{ $t('landing.faq.callout') }}</p>
          </UCard>
        </div>

        <UCard class="landing-surface-card">
          <UAccordion
            :items="faqItems"
            :ui="{
              root: 'space-y-2',
              item: 'border border-slate-600/28 rounded-xl bg-slate-900/46 px-2',
              trigger: 'text-base font-semibold text-slate-100 px-3 py-3',
              body: 'px-3 pb-4 text-sm text-slate-300'
            }"
          />
        </UCard>
      </div>
    </UContainer>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LandingFaq' });

const { t } = useI18n();

const faqItems = computed(() => [
  {
    label: t('landing.faq.items.data.question'),
    content: t('landing.faq.items.data.answer')
  },
  {
    label: t('landing.faq.items.industries.question'),
    content: t('landing.faq.items.industries.answer')
  },
  {
    label: t('landing.faq.items.model.question'),
    content: t('landing.faq.items.model.answer')
  },
  {
    label: t('landing.faq.items.output.question'),
    content: t('landing.faq.items.output.answer')
  }
]);
</script>

<style lang="scss">
.landing-faq {
  &__container {
    max-width: 1260px;
  }
}
</style>
