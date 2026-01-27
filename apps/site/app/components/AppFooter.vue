<template>
  <UFooterColumns :columns="footerColumns">
    <template #left>
      <p class="text-sm text-muted">
        {{ $t('footer.copyright', { year: currentYear }) }}
      </p>
    </template>
    <template #right>
      <p class="text-sm text-muted">
        {{ $t('footer.tagline') }}
      </p>
    </template>
  </UFooterColumns>
</template>

<script setup lang="ts">
/**
 * AppFooter Component
 *
 * Site footer using Nuxt UI Pro FooterColumns
 * Per docs/design/mvp.md - SaaS template footer patterns
 */

defineOptions({ name: 'AppFooter' });

const { t } = useI18n();

const currentYear = new Date().getFullYear();

const footerColumns = computed(() => [
  {
    label: t('footer.product'),
    children: [
      { label: t('footer.features'), to: '/#features' },
      { label: t('footer.pricing'), to: '/pricing' },
      { label: t('footer.docs'), to: '/docs' }
    ]
  },
  {
    label: t('footer.company'),
    children: [
      { label: t('footer.about'), to: '/about' },
      { label: t('footer.blog'), to: '/blog' },
      { label: t('footer.contact'), to: '/contact' }
    ]
  },
  {
    label: t('footer.legal'),
    children: [
      { label: t('footer.privacy'), to: '/privacy' },
      { label: t('footer.terms'), to: '/terms' }
    ]
  }
]);
</script>
