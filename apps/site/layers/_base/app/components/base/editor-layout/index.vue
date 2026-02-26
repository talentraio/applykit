<template>
  <div class="base-editor-layout">
    <header v-if="$slots.header" class="base-editor-layout__header py-4">
      <slot name="header" />
    </header>

    <div class="base-editor-layout__main">
      <BaseEditorLayoutLeftColumn
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-dirty="isDirty"
        @undo="emit('undo')"
        @redo="emit('redo')"
        @discard="emit('discard')"
      >
        <slot name="left" />

        <template v-if="$slots['left-actions']" #actions>
          <slot name="left-actions" />
        </template>
      </BaseEditorLayoutLeftColumn>

      <BaseEditorLayoutRightColumn
        v-model:mode="mode"
        :mode-options="modeOptions"
        :empty-text="emptyText"
      >
        <template v-if="$slots['right-actions']" #actions>
          <slot name="right-actions" />
        </template>

        <template #preview>
          <slot name="preview" />
        </template>
      </BaseEditorLayoutRightColumn>
    </div>

    <BaseEditorLayoutMobilePreview
      v-if="mobilePreviewEnabled"
      v-model:mode="mode"
      :mode-options="modeOptions"
      :title="mobilePreviewTitle"
      :button-aria-label="mobilePreviewAriaLabel"
      :close-label="mobileCloseLabel"
    >
      <template #preview>
        <slot name="mobile-preview">
          <slot name="preview" />
        </slot>
      </template>

      <template v-if="$slots['mobile-preview-actions']" #actions>
        <slot name="mobile-preview-actions" />
      </template>
    </BaseEditorLayoutMobilePreview>
  </div>
</template>

<script setup lang="ts">
import type { BaseEditorLayoutModeOption } from './types';
import BaseEditorLayoutLeftColumn from './LeftColumn.vue';
import BaseEditorLayoutMobilePreview from './MobilePreview.vue';
import BaseEditorLayoutRightColumn from './RightColumn.vue';

defineOptions({ name: 'BaseEditorLayout' });

withDefaults(
  defineProps<{
    modeOptions: BaseEditorLayoutModeOption[];
    canUndo?: boolean;
    canRedo?: boolean;
    isDirty?: boolean;
    emptyText?: string;
    mobilePreviewEnabled?: boolean;
    mobilePreviewTitle?: string;
    mobilePreviewAriaLabel?: string;
    mobileCloseLabel?: string;
  }>(),
  {
    canUndo: false,
    canRedo: false,
    isDirty: false,
    emptyText: '',
    mobilePreviewEnabled: true,
    mobilePreviewTitle: 'Preview',
    mobilePreviewAriaLabel: 'Open preview',
    mobileCloseLabel: 'Close'
  }
);

const emit = defineEmits<{
  undo: [];
  redo: [];
  discard: [];
}>();

const mode = defineModel<string>('mode', { required: true });
</script>

<style lang="scss">
.base-editor-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__header {
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-neutral-200);

    @media (prefers-color-scheme: dark) {
      border-bottom-color: var(--color-neutral-800);
    }
  }

  &__main {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;

    @media (width <= 1023px) {
      flex-direction: column;
    }
  }
}
</style>
