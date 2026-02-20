import type { Ref } from 'vue';

type UseResumeEditorToolbarActionsOptions = {
  resumeId: Readonly<Ref<string>>;
  isDefaultResume?: Readonly<Ref<boolean>>;
};

export function useResumeEditorToolbarActions(options: UseResumeEditorToolbarActionsOptions) {
  const { t } = useI18n();
  const toast = useToast();
  const store = useResumeStore();
  const { openUploadModal, openCreateFromScratchModal, openDeleteConfirmModal } = useResumeModals();

  const isBusy = ref(false);
  const isDefaultResume = options.isDefaultResume ?? computed(() => false);
  const isActionDisabled = computed(() => !options.resumeId.value || isBusy.value);

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
      if (result.resume.id !== options.resumeId.value) {
        await navigateTo(`/resume/${result.resume.id}`);
      }
      return;
    }

    if (result?.action === 'create-from-scratch') {
      await openCreateFromScratchModal({
        replaceResumeId
      });
    }
  };

  const handleAddNew = async () => {
    await runAction(async () => {
      await runCreateFlow();
    });
  };

  const handleDuplicate = async () => {
    await runAction(async () => {
      const resumeId = options.resumeId.value;
      if (!resumeId) return;

      try {
        const newResume = await store.duplicateResume(resumeId);
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
      const resumeId = options.resumeId.value;
      if (!resumeId) return;
      await runCreateFlow(resumeId);
    });
  };

  const handleMakeDefault = async () => {
    await runAction(async () => {
      const resumeId = options.resumeId.value;
      if (!resumeId || isDefaultResume.value) return;

      try {
        await store.setDefaultResume(resumeId);
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
      const resumeId = options.resumeId.value;
      if (!resumeId || isDefaultResume.value) return;

      const result = await openDeleteConfirmModal();
      if (result?.action !== 'confirmed') {
        return;
      }

      try {
        await store.deleteResume(resumeId);
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

  return {
    isBusy,
    isActionDisabled,
    handleAddNew,
    handleDuplicate,
    handleClearAndCreateNew,
    handleMakeDefault,
    handleDelete
  };
}
