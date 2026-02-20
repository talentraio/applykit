<template>
  <div class="resume-editor-toolbar">
    <ResumeEditorToolbarSelector
      :resume-id="resumeId"
      :resume-list="resumeList"
      :disabled="disabled"
      class="resume-editor-toolbar__selector"
    />

    <ResumeEditorToolbarMenu
      :resume-id="resumeId"
      :is-default-resume="isDefaultResume"
      class="resume-editor-toolbar__menu"
    />
  </div>
</template>

<script setup lang="ts">
import type { ResumeListItem } from '@int/schema';

defineOptions({ name: 'ResumeEditorToolbar' });

withDefaults(
  defineProps<{
    resumeId: string;
    resumeList: ResumeListItem[];
    disabled?: boolean;
    isDefaultResume?: boolean;
  }>(),
  {
    disabled: false,
    isDefaultResume: false
  }
);
</script>

<style lang="scss">
.resume-editor-toolbar {
  padding: 0.5rem 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__selector {
    flex: 1;
    min-width: 0;
  }

  &__menu {
    flex-shrink: 0;
  }
}
</style>
