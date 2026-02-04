<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('resume.page.createTitle')"
    class="resume-modal-create-from-scratch"
  >
    <template #body>
      <p class="mb-4 text-sm text-muted">
        {{ $t('resume.page.createDescription') }}
      </p>
      <UButton color="primary" block :loading="loading" @click="emit('confirm')">
        {{ $t('resume.page.createButton') }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Resume Create From Scratch Modal
 *
 * Modal wrapper for creating an empty resume.
 */

defineOptions({ name: 'ResumeModalCreateFromScratch' });

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });
</script>
