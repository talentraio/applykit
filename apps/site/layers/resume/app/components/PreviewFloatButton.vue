<template>
  <div class="preview-float-button">
    <UButton
      color="primary"
      size="lg"
      icon="i-lucide-eye"
      :aria-label="$t('resume.preview.mobileButton')"
      class="preview-float-button__btn"
      @click="$emit('click')"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Preview Float Button Component
 *
 * FAB (Floating Action Button) for mobile preview access.
 * Positioned bottom-right, visible only on mobile (<1024px).
 *
 * Features:
 * - Fixed position bottom-right
 * - Eye icon for preview
 * - Only visible on mobile screens
 *
 * Related: T050 (US5)
 */

defineOptions({ name: 'ResumePreviewFloatButton' });

defineEmits<{
  click: [];
}>();
</script>

<style lang="scss">
.preview-float-button {
  // Hidden on desktop, visible on mobile
  display: none;

  @media (width <= 1023px) {
    display: block;
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
  }

  &__btn {
    box-shadow:
      0 4px 14px rgb(0 0 0 / 25%),
      0 2px 6px rgb(0 0 0 / 15%);
    border-radius: 9999px;

    @media (prefers-color-scheme: dark) {
      box-shadow:
        0 4px 14px rgb(0 0 0 / 50%),
        0 2px 6px rgb(0 0 0 / 35%);
    }
  }
}
</style>
