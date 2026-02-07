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

      <UButton color="primary" block :loading="isCreating" @click="handleConfirm">
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

import type { ResumeContent } from '@int/schema';

defineOptions({ name: 'ResumeModalCreateFromScratch' });

const isOpen = defineModel<boolean>('open', { default: false });
const isCreating = ref(false);
const { t } = useI18n();
const toast = useToast();
const { profile } = useProfile();
const resumeStore = useResumeStore();

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error && error.message ? error.message : undefined;
}

async function handleConfirm() {
  if (isCreating.value) return;

  const fullName = profile.value?.firstName
    ? `${profile.value.firstName} ${profile.value.lastName ?? ''}`.trim()
    : t('resume.placeholder.fullName');
  const email = profile.value?.email || 'your.email@example.com';

  const emptyContent: ResumeContent = {
    personalInfo: {
      fullName,
      email
    },
    experience: [],
    education: [],
    skills: [{ type: t('resume.placeholder.skillType'), skills: [t('resume.placeholder.skill')] }]
  };

  isCreating.value = true;
  try {
    await resumeStore.createFromContent(emptyContent, 'My Resume');
    isOpen.value = false;
    toast.add({
      title: t('resume.success.created'),
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch (error) {
    toast.add({
      title: t('resume.error.createFailed'),
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    isCreating.value = false;
  }
}
</script>
