<template>
  <div class="base-editor-layout-view-toggle">
    <UFieldGroup :size="size">
      <UButton
        v-for="option in options"
        :key="option.value"
        :color="modelValue === option.value ? 'primary' : 'neutral'"
        :variant="modelValue === option.value ? 'solid' : 'outline'"
        :icon="option.icon"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </UButton>
    </UFieldGroup>
  </div>
</template>

<script setup lang="ts">
import type { BaseEditorLayoutModeOption } from './types';

type ToggleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

defineOptions({ name: 'BaseEditorLayoutViewToggle' });

withDefaults(
  defineProps<{
    modelValue: string;
    options: BaseEditorLayoutModeOption[];
    size?: ToggleSize;
  }>(),
  {
    size: 'sm'
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style lang="scss">
.base-editor-layout-view-toggle {
  display: inline-flex;
}
</style>
