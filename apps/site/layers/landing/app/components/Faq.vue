<template>
  <section class="landing-faq">
    <div class="landing-faq__container container mx-auto px-4 py-16 lg:py-24">
      <h2 class="landing-faq__title text-3xl lg:text-4xl font-bold text-center mb-12">
        {{ $t('landing.faq.title') }}
      </h2>

      <div class="landing-faq__grid grid gap-6 max-w-4xl mx-auto">
        <UAccordion
          :items="faqItems"
          :ui="{
            root: 'space-y-4',
            trigger: 'text-base font-semibold',
            body: 'text-base text-gray-600 dark:text-gray-400'
          }"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Landing FAQ Component
 *
 * Frequently asked questions accordion
 * Per docs/architecture/homepage.md
 *
 * T153 [Phase 12] Landing page FAQ section
 */

defineOptions({ name: 'LandingFaq' });

const { t } = useI18n();

const faqItems = computed(() => [
  {
    label: t('landing.faq.apiKey.question'),
    content: t('landing.faq.apiKey.answer'),
    defaultOpen: false
  },
  {
    label: t('landing.faq.atsPlain.question'),
    content: t('landing.faq.atsPlain.answer'),
    defaultOpen: false
  },
  {
    label: t('landing.faq.editing.question'),
    content: t('landing.faq.editing.answer'),
    defaultOpen: false
  },
  {
    label: t('landing.faq.formats.question'),
    content: t('landing.faq.formats.answer'),
    defaultOpen: false
  }
]);
</script>
