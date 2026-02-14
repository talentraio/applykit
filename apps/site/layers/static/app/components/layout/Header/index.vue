<template>
  <header class="static-layout-header sticky top-0 z-50 border-b border-default bg-default">
    <div
      class="static-layout-header__content mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-4 lg:px-6"
    >
      <div class="static-layout-header__left flex items-center gap-4">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          class="md:hidden"
          @click="isMobileMenuOpen = true"
        />

        <NuxtLink to="/" class="static-layout-header__logo text-lg font-semibold">
          {{ appTitle }}
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Shared site header with navigation and profile actions.
 */

defineOptions({ name: 'StaticLayoutHeader' });

defineProps<{
  appTitle: string;
}>();

const isMobileMenuOpen = defineModel<boolean>('open', { default: false });
</script>
