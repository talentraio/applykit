<template>
  <ProfileIncompleteModal
    v-model:open="isOpen"
    return-to="/resume"
    @cancel="emit('cancel')"
    @navigate="emit('navigate')"
  />
</template>

<script setup lang="ts">
/**
 * Resume-specific ProfileIncompleteModal wrapper
 *
 * Delegates to the base ProfileIncompleteModal with resume-specific returnTo.
 */

defineOptions({ name: 'ResumeProfileIncompleteModal' });

const emit = defineEmits<{
  cancel: [];
  navigate: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });
</script>
