<template>
  <div class="base-editor-layout-mobile-preview">
    <UButton
      color="primary"
      size="lg"
      icon="i-lucide-eye"
      :aria-label="buttonAriaLabel"
      class="base-editor-layout-mobile-preview__button"
      @click="isOpen = true"
    />

    <UModal
      v-model:open="isOpen"
      :title="title"
      fullscreen
      :ui="{
        content: 'flex flex-col h-full',
        body: 'flex-1 overflow-hidden p-0'
      }"
    >
      <template #body>
        <div class="base-editor-layout-mobile-preview__overlay">
          <div class="base-editor-layout-mobile-preview__header">
            <BaseEditorLayoutViewToggle v-model="mode" :options="modeOptions" />
          </div>

          <div class="base-editor-layout-mobile-preview__content">
            <slot name="preview">
              <div class="base-editor-layout-mobile-preview__empty">
                <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
              </div>
            </slot>
          </div>

          <div class="base-editor-layout-mobile-preview__footer">
            <UButton variant="ghost" color="neutral" icon="i-lucide-x" @click="isOpen = false">
              {{ closeLabel }}
            </UButton>

            <slot name="actions" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { BaseEditorLayoutModeOption } from './types';
import BaseEditorLayoutViewToggle from './ViewToggle.vue';

defineOptions({ name: 'BaseEditorLayoutMobilePreview' });

withDefaults(
  defineProps<{
    modeOptions: BaseEditorLayoutModeOption[];
    title?: string;
    closeLabel?: string;
    buttonAriaLabel?: string;
  }>(),
  {
    title: 'Preview',
    closeLabel: 'Close',
    buttonAriaLabel: 'Open preview'
  }
);

const mode = defineModel<string>('mode', { required: true });
const isOpen = ref(false);
</script>

<style lang="scss">
.base-editor-layout-mobile-preview {
  display: none;

  @media (width <= 1023px) {
    display: block;
  }

  &__button {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
    border-radius: 9999px;
    box-shadow:
      0 4px 14px rgb(0 0 0 / 25%),
      0 2px 6px rgb(0 0 0 / 15%);

    @media (prefers-color-scheme: dark) {
      box-shadow:
        0 4px 14px rgb(0 0 0 / 50%),
        0 2px 6px rgb(0 0 0 / 35%);
    }
  }

  &__overlay {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-neutral-100);

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutral-900);
    }
  }

  &__header {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-bottom-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  &__empty {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-top: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-top-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }
}
</style>
