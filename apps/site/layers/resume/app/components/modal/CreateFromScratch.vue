<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('resume.page.createTitle')"
    :description="$t('resume.page.createDescription')"
    class="resume-modal-create-from-scratch"
  >
    <template #body>
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

const props = defineProps<{
  replaceResumeId?: string;
}>();

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
    const title = props.replaceResumeId ? undefined : 'My Resume';
    const resume = await resumeStore.createFromContent(emptyContent, title, props.replaceResumeId);
    isOpen.value = false;
    toast.add({
      title: t('resume.success.created'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    if (!props.replaceResumeId || props.replaceResumeId !== resume.id) {
      await navigateTo(`/resume/${resume.id}`);
    }
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
