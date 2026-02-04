<template>
  <UFieldGroup :size="size">
    <UButton
      :color="modelValue === 'ats' ? 'primary' : 'neutral'"
      :variant="modelValue === 'ats' ? 'solid' : 'outline'"
      @click="emit('update:modelValue', 'ats')"
    >
      {{ $t('resume.settings.previewType.ats') }}
    </UButton>
    <UButton
      :color="modelValue === 'human' ? 'primary' : 'neutral'"
      :variant="modelValue === 'human' ? 'solid' : 'outline'"
      @click="emit('update:modelValue', 'human')"
    >
      {{ $t('resume.settings.previewType.human') }}
    </UButton>
  </UFieldGroup>
</template>

<script setup lang="ts">
type PreviewType = 'ats' | 'human';
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
</script>
