<template>
  <footer class="border-t border-default bg-default">
    <UContainer class="py-6">
      <!-- Links row - centered -->
      <nav class="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <ULink to="/#features" class="text-muted hover:text-default">
          {{ $t('footer.features') }}
        </ULink>
        <ULink to="/pricing" class="text-muted hover:text-default">
          {{ $t('footer.pricing') }}
        </ULink>
        <ULink to="/docs" class="text-muted hover:text-default">
          {{ $t('footer.docs') }}
        </ULink>
        <ULink to="/privacy" class="text-muted hover:text-default">
          {{ $t('footer.privacy') }}
        </ULink>
        <ULink to="/terms" class="text-muted hover:text-default">
          {{ $t('footer.terms') }}
        </ULink>
      </nav>

      <!-- Copyright row - centered -->
      <div
        class="flex flex-col items-center gap-2 text-center text-sm text-muted sm:flex-row sm:justify-between"
      >
        <p>{{ $t('footer.copyright', { year: currentYear }) }}</p>
        <p>{{ $t('footer.tagline') }}</p>
      </div>
    </UContainer>
  </footer>
</template>

<script setup lang="ts">
/**
 * AppFooter Component
 *
 * Simple centered footer for dashboard pages
 * - Links in a centered row
 * - Copyright and tagline below
 */

defineOptions({ name: 'AppFooter' });

const currentYear = new Date().getFullYear();
</script>
