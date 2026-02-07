<template>
  <UFieldGroup :size="size">
    <UButton
      :color="modelValue === atsFormat ? 'primary' : 'neutral'"
      :variant="modelValue === atsFormat ? 'solid' : 'outline'"
      @click="emit('update:modelValue', atsFormat)"
    >
      {{ $t('resume.settings.previewType.ats') }}
    </UButton>
    <UButton
      :color="modelValue === humanFormat ? 'primary' : 'neutral'"
      :variant="modelValue === humanFormat ? 'solid' : 'outline'"
      @click="emit('update:modelValue', humanFormat)"
    >
      {{ $t('resume.settings.previewType.human') }}
    </UButton>
  </UFieldGroup>
</template>

<script setup lang="ts">
import type { PreviewType } from '../../../types/preview';
import { EXPORT_FORMAT_MAP } from '@int/schema';

type ToggleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

defineOptions({ name: 'BasePreviewTypeToggle' });

withDefaults(
  defineProps<{
    modelValue: PreviewType;
    size?: ToggleSize;
  }>(),
  {
    size: 'sm'
  }
);
const emit = defineEmits<{
  'update:modelValue': [value: PreviewType];
}>();
const atsFormat = EXPORT_FORMAT_MAP.ATS;
const humanFormat = EXPORT_FORMAT_MAP.HUMAN;
</script>
