<template>
  <UPageCard class="base-content-block">
    <template v-if="title" #header>
      <h3 class="text-lg font-semibold">{{ title }}</h3>
    </template>

    <div
      class="base-content-block__content prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert"
    >
      <slot />
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
defineOptions({ name: 'BaseContentBlock' });

defineProps<{
  title?: string | null;
}>();
</script>

<style lang="scss">
.base-content-block {
  &__content {
    // Standard content wrapper for card-like text blocks
  }
}
</style>
