<template>
  <main class="base-editor-layout-right-column">
    <div class="base-editor-layout-right-column__header">
      <div class="base-editor-layout-right-column__header-left" />

      <div class="base-editor-layout-right-column__header-center pb-2">
        <BaseEditorLayoutViewToggle v-model="mode" :options="modeOptions" />
      </div>

      <div class="base-editor-layout-right-column__header-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="base-editor-layout-right-column__content">
      <slot name="preview">
        <div class="base-editor-layout-right-column__empty">
          <UIcon name="i-lucide-file-text" class="h-12 w-12 text-muted" />
          <p class="mt-4 text-muted">{{ emptyText }}</p>
        </div>
      </slot>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { BaseEditorLayoutModeOption } from './types';
import BaseEditorLayoutViewToggle from './ViewToggle.vue';

defineOptions({ name: 'BaseEditorLayoutRightColumn' });

withDefaults(
  defineProps<{
    modeOptions: BaseEditorLayoutModeOption[];
    emptyText?: string;
  }>(),
  {
    emptyText: ''
  }
);

const mode = defineModel<string>('mode', { required: true });
</script>

<style lang="scss">
.base-editor-layout-right-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background-color: var(--color-neutral-100);

  @media (prefers-color-scheme: dark) {
    background-color: var(--color-neutral-900);
  }

  @media (width <= 1023px) {
    display: none;
  }

  &__header {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem 0;
  }

  &__header-left {
    min-width: 0;
  }

  &__header-center {
    display: flex;
    justify-content: center;
    min-width: 0;
  }

  &__header-actions {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }

  &__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 0.75rem 1.5rem 1.5rem;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }
}
</style>
