<template>
  <UDropdownMenu
    :items="menuItems"
    :content="{ align: 'end' }"
    :ui="{
      content: 'w-[var(--reka-dropdown-menu-trigger-width)] min-w-56'
    }"
    class="resume-editor-selector-menu"
  >
    <UButton
      variant="outline"
      color="neutral"
      size="md"
      square
      icon="i-lucide-menu"
      :aria-label="t('resume.page.actionsMenu')"
      :loading="isBusy"
      :disabled="isMenuDisabled"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';

defineOptions({ name: 'ResumeEditorSelectorMenu' });

const props = withDefaults(
  defineProps<{
    resumeId: string;
    isDefaultResume?: boolean;
  }>(),
  {
    isDefaultResume: false
  }
);

const { t } = useI18n();
const toast = useToast();
const store = useResumeStore();
const { openUploadModal, openCreateFromScratchModal, openDeleteConfirmModal } = useResumeModals();

const isBusy = ref(false);
const isMenuDisabled = computed(() => !props.resumeId || isBusy.value);

const getErrorMessage = (error: unknown): string | undefined => {
  return error instanceof Error && error.message ? error.message : undefined;
};

const showErrorToast = (title: string, error: unknown) => {
  toast.add({
    title,
    description: getErrorMessage(error),
    color: 'error',
    icon: 'i-lucide-alert-circle'
  });
};

const runAction = async (handler: () => Promise<void>) => {
  if (isBusy.value) return;

  isBusy.value = true;
  try {
    await handler();
  } finally {
    isBusy.value = false;
  }
};

const handleUploadError = (error: Error) => {
  showErrorToast(t('resume.error.uploadFailed'), error);
};

const runCreateFlow = async (replaceResumeId?: string): Promise<void> => {
  const result = await openUploadModal({
    onError: handleUploadError,
    replaceResumeId
  });

  if (result?.action === 'uploaded') {
    if (result.resume.id !== props.resumeId) {
      await navigateTo(`/resume/${result.resume.id}`);
    }
    return;
  }

  if (result?.action === 'create-from-scratch') {
    await openCreateFromScratchModal({ replaceResumeId });
  }
};

const handleAddNew = async () => {
  await runAction(async () => {
    await runCreateFlow();
  });
};

const handleDuplicate = async () => {
  await runAction(async () => {
    if (!props.resumeId) return;

    try {
      const newResume = await store.duplicateResume(props.resumeId);
      toast.add({
        title: t('resume.page.resumeDuplicated'),
        color: 'success',
        icon: 'i-lucide-check'
      });
      await navigateTo(`/resume/${newResume.id}`);
    } catch (error) {
      showErrorToast(t('resume.error.createFailed'), error);
    }
  });
};

const handleClearAndCreateNew = async () => {
  await runAction(async () => {
    if (!props.resumeId) return;
    await runCreateFlow(props.resumeId);
  });
};

const handleMakeDefault = async () => {
  await runAction(async () => {
    if (!props.resumeId || props.isDefaultResume) return;

    try {
      await store.setDefaultResume(props.resumeId);
      toast.add({
        title: t('resume.page.defaultResumeUpdated'),
        color: 'success',
        icon: 'i-lucide-check'
      });
    } catch (error) {
      showErrorToast(t('resume.error.updateFailed'), error);
    }
  });
};

const handleDelete = async () => {
  await runAction(async () => {
    if (!props.resumeId || props.isDefaultResume) return;

    const result = await openDeleteConfirmModal();
    if (result?.action !== 'confirmed') {
      return;
    }

    try {
      await store.deleteResume(props.resumeId);
      toast.add({
        title: t('resume.page.resumeDeleted'),
        color: 'success',
        icon: 'i-lucide-check'
      });

      const nextResumeId = store.defaultResumeId ?? store.resumeList[0]?.id;
      if (nextResumeId) {
        await navigateTo(`/resume/${nextResumeId}`, { replace: true });
        return;
      }

      await navigateTo('/resume', { replace: true });
    } catch (error) {
      showErrorToast(t('resume.error.deleteFailed'), error);
    }
  });
};

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const primaryItems: DropdownMenuItem[] = [
    {
      label: t('resume.page.addNew'),
      icon: 'i-lucide-plus',
      disabled: isMenuDisabled.value,
      onSelect: () => {
        void handleAddNew();
      }
    },
    {
      label: t('resume.page.duplicateResume'),
      icon: 'i-lucide-copy',
      disabled: isMenuDisabled.value,
      onSelect: () => {
        void handleDuplicate();
      }
    },
    {
      label: t('resume.page.clearAndCreateNew'),
      icon: 'i-lucide-eraser',
      disabled: isMenuDisabled.value,
      onSelect: () => {
        void handleClearAndCreateNew();
      }
    }
  ];

  if (!props.isDefaultResume) {
    primaryItems.push({
      label: t('resume.page.makeDefault'),
      icon: 'i-lucide-star',
      disabled: isMenuDisabled.value,
      onSelect: () => {
        void handleMakeDefault();
      }
    });
  }

  if (props.isDefaultResume) {
    return [primaryItems];
  }

  return [
    primaryItems,
    [
      {
        label: t('resume.page.deleteResume'),
        icon: 'i-lucide-trash-2',
        disabled: isMenuDisabled.value,
        onSelect: () => {
          void handleDelete();
        }
      }
    ]
  ];
});
</script>

<style lang="scss">
.resume-editor-selector-menu {
  display: inline-flex;
}
</style>
