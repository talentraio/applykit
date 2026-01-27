<template>
  <UApp class="site-error-page bg-neutral-50">
    <div
      class="site-error-page__content container mx-auto flex min-h-screen max-w-4xl items-center justify-center p-6"
    >
      <UPageCard class="w-full text-center">
        <div class="flex justify-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600"
          >
            <UIcon name="i-lucide-alert-triangle" class="h-10 w-10" />
          </div>
        </div>
        <p class="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
          {{ statusCode }}
        </p>
        <h1 class="mt-3 text-3xl font-bold">
          {{ $t('errors.generic.title') }}
        </h1>
        <p class="mt-3 text-muted">
          {{ $t('errors.generic.description') }}
        </p>
        <p v-if="statusText" class="mt-2 text-sm text-muted">
          {{ statusText }}
        </p>
        <p v-if="debugMessage" class="mt-2 text-xs text-muted">
          {{ debugMessage }}
        </p>
        <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <UButton color="primary" size="lg" @click="goHome">
            {{ $t('errors.actions.home') }}
          </UButton>
          <UButton color="neutral" variant="ghost" size="lg" @click="retry">
            {{ $t('errors.actions.retry') }}
          </UButton>
        </div>
      </UPageCard>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

defineOptions({ name: 'SiteErrorPage' });

const props = defineProps<{ error: NuxtError }>();

const statusCode = computed(() => props.error.statusCode || 500);

const statusText = computed(() => props.error.statusMessage || '');

const debugMessage = computed(() => {
  if (import.meta.dev && props.error.message) {
    return props.error.message;
  }

  return '';
});

const goHome = () => {
  clearError({ redirect: '/' });
};

const retry = () => {
  clearError();
};
</script>
