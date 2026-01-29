<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-warning-500/10 text-warning-500"
            >
              <UIcon name="i-lucide-alert-triangle" class="h-5 w-5" />
            </div>
            <h3 class="text-lg font-semibold">
              {{ $t('resume.profileIncomplete.title') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('resume.profileIncomplete.description') }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="handleCancel">
              {{ $t('resume.profileIncomplete.cancel') }}
            </UButton>
            <UButton color="primary" @click="handleGoToProfile">
              {{ $t('resume.profileIncomplete.goToProfile') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * ProfileIncompleteModal Component
 *
 * Modal shown when user tries to upload a resume without completing their profile.
 * Provides warning and navigation to profile page.
 */

defineOptions({ name: 'ResumeProfileIncompleteModal' });

const emit = defineEmits<{
  cancel: [];
  navigate: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });

const handleCancel = () => {
  isOpen.value = false;
  emit('cancel');
};

const handleGoToProfile = () => {
  isOpen.value = false;
  emit('navigate');
  navigateTo('/profile?from=resume-upload');
};
</script>
