<template>
  <div class="undo-redo-controls">
    <UTooltip :text="canUndo ? $t('resume.history.undo') : $t('resume.history.undoDisabled')">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-undo-2"
        size="sm"
        :disabled="!canUndo"
        :aria-label="$t('resume.history.undo')"
        @click="emit('undo')"
      />
    </UTooltip>

    <UTooltip :text="canRedo ? $t('resume.history.redo') : $t('resume.history.redoDisabled')">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-redo-2"
        size="sm"
        :disabled="!canRedo"
        :aria-label="$t('resume.history.redo')"
        @click="emit('redo')"
      />
    </UTooltip>

    <span v-if="showCount && historyLength > 0" class="undo-redo-controls__count">
      {{ $t('resume.history.changes', { count: historyLength }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * Undo/Redo Controls Component
 *
 * Reusable undo/redo buttons with tooltips.
 * Can be used with any store that provides undo/redo functionality.
 *
 * Related: T036 (US3)
 */

defineOptions({ name: 'BaseUndoRedoControls' });

withDefaults(
  defineProps<{
    /**
     * Whether undo is available
     */
    canUndo: boolean;
    /**
     * Whether redo is available
     */
    canRedo: boolean;
    /**
     * Number of history entries (for display)
     */
    historyLength?: number;
    /**
     * Show history count
     */
    showCount?: boolean;
  }>(),
  {
    historyLength: 0,
    showCount: false
  }
);

const emit = defineEmits<{
  /** Undo action */
  undo: [];
  /** Redo action */
  redo: [];
}>();
</script>

<style lang="scss">
.undo-redo-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &__count {
    margin-left: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-neutral-500);
  }
}
</style>
