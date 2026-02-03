<template>
  <UDrawer v-model:open="isMobileMenuOpen" class="layout-mobile-nav" direction="left">
    <template #content>
      <div class="layout-mobile-nav__content flex h-full flex-col">
        <div
          class="layout-mobile-nav__header flex items-center justify-between border-b border-default p-4"
        >
          <span class="text-lg font-semibold">{{ $t('nav.menu') }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isMobileMenuOpen = false"
          />
        </div>

        <nav class="layout-mobile-nav__links flex flex-col gap-1 p-4">
          <UButton
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            :icon="link.icon"
            color="neutral"
            variant="ghost"
            class="justify-start"
            block
            @click="isMobileMenuOpen = false"
          >
            {{ link.label }}
          </UButton>
        </nav>
      </div>
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
/**
 * Shared mobile navigation drawer.
 */

defineOptions({ name: 'LayoutMobileNav' });

const isMobileMenuOpen = defineModel<boolean>('open', { default: false });

const navLinks = useNavLinks();
</script>
