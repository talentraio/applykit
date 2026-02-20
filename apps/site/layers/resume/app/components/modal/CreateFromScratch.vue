<template>
  <UModal
    v-model:open="isOpen"
    :title="$t('resume.page.createTitle')"
    :description="$t('resume.page.createDescription')"
    class="resume-modal-create-from-scratch"
  >
    <template #body>
      <div class="resume-modal-create-from-scratch__body">
        <UFormField
          v-if="isNameRequired"
          :label="$t('resume.upload.resumeNameLabel')"
          name="resume-name"
          required
          :error="resumeNameError || undefined"
          class="resume-modal-create-from-scratch__name-field"
        >
          <UInput
            v-model="resumeName"
            :placeholder="$t('resume.upload.resumeNamePlaceholder')"
            :maxlength="255"
            :disabled="isCreating"
            class="w-full"
          />
        </UFormField>

        <UButton color="primary" block :loading="isCreating" @click="handleConfirm">
          {{ $t('resume.page.createButton') }}
        </UButton>
      </div>
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
const resumeName = ref('');
const resumeNameError = ref<string | null>(null);
const { t } = useI18n();
const toast = useToast();
const { profile } = useProfile();
const resumeStore = useResumeStore();
const isNameRequired = computed(() => !props.replaceResumeId);
const normalizedResumeName = computed(() => {
  const normalized = resumeName.value.trim();
  return normalized.length > 0 ? normalized : undefined;
});

watch(resumeName, () => {
  resumeNameError.value = null;
});

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error && error.message ? error.message : undefined;
}

function validateResumeName(): string | null {
  if (!isNameRequired.value) {
    return null;
  }

  if (normalizedResumeName.value) {
    return null;
  }

  return t('resume.upload.resumeNameRequired');
}

async function handleConfirm() {
  if (isCreating.value) return;

  resumeNameError.value = null;
  const nameValidationError = validateResumeName();
  if (nameValidationError) {
    resumeNameError.value = nameValidationError;
    return;
  }

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
    const title = isNameRequired.value ? normalizedResumeName.value : undefined;
    const resume = await resumeStore.createFromContent(emptyContent, title, props.replaceResumeId);
    isOpen.value = false;
    resumeName.value = '';
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

<style lang="scss">
.resume-modal-create-from-scratch {
  &__body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
