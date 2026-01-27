<template>
  <div class="site-not-found-page container mx-auto flex min-h-[70vh] max-w-4xl items-center p-6">
    <UPageCard class="w-full text-center">
      <div class="flex justify-center">
        <div
          class="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
        >
          <UIcon name="i-lucide-map-pin" class="h-10 w-10" />
        </div>
      </div>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">404</p>
      <h1 class="mt-3 text-3xl font-bold">
        {{ $t('errors.notFound.title') }}
      </h1>
      <p class="mt-3 text-muted">
        {{ $t('errors.notFound.description') }}
      </p>
      <p class="mt-4 text-xs text-muted">
        {{ $t('errors.notFound.pathLabel', { path: route.fullPath }) }}
      </p>
      <div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <UButton color="primary" size="lg" @click="goHome">
          {{ $t('errors.actions.home') }}
        </UButton>
        <UButton color="neutral" variant="ghost" size="lg" @click="goBack">
          {{ $t('errors.actions.back') }}
        </UButton>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SiteNotFoundPage' });

const route = useRoute();
const router = useRouter();

const event = useRequestEvent();
if (event) {
  setResponseStatus(event, 404);
}

const goHome = () => {
  navigateTo('/');
};

const goBack = () => {
  router.back();
};
</script>
