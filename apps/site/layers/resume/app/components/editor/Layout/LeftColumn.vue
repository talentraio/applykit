<template>
  <aside class="resume-editor-layout-left-column">
    <div class="resume-editor-layout-left-column__content">
      <slot />
    </div>

    <div v-if="$slots.actions" class="resume-editor-layout-left-column__actions">
      <slot name="actions" />
    </div>

    <div class="resume-editor-layout-left-column__footer">
      <div class="resume-editor-layout-left-column__footer-row">
        <BaseUndoRedoControls
          :can-undo="canUndo"
          :can-redo="canRedo"
          @undo="emit('undo')"
          @redo="emit('redo')"
        />

        <div class="flex items-center gap-2">
          <UButton
            v-if="isDirty"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="emit('discard')"
          >
            {{ $t('common.cancel') }}
          </UButton>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineOptions({ name: 'ResumeEditorLayoutLeftColumn' });

withDefaults(
  defineProps<{
    canUndo?: boolean;
    canRedo?: boolean;
    isDirty?: boolean;
  }>(),
  {
    canUndo: false,
    canRedo: false,
    isDirty: false
  }
);

const emit = defineEmits<{
  undo: [];
  redo: [];
  discard: [];
}>();
</script>

<style lang="scss">
.resume-editor-layout-left-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  // Desktop: 40% width
  @media (width >= 1024px) {
    width: 40%;
    min-width: 360px;
    max-width: 480px;
    border-right: 1px solid var(--color-neutral-200);

    @media (prefers-color-scheme: dark) {
      border-right-color: var(--color-neutral-800);
    }
  }

  // Mobile: full width
  @media (width <= 1023px) {
    flex: 1;
    width: 100%;
  }

  &__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  &__footer {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-neutral-200);
    background-color: var(--color-neutral-50);

    @media (prefers-color-scheme: dark) {
      border-top-color: var(--color-neutral-800);
      background-color: var(--color-neutral-950);
    }
  }

  &__footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__actions {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
  }
}
</style>
