import { LazyBaseModalGenerationStatus } from '#components';

export type GenerationStatusModalState = 'loading' | 'success' | 'error';

export type GenerationStatusModalClosePayload =
  | { action: 'acknowledged-success' }
  | { action: 'acknowledged-error' }
  | undefined;

export type GenerationStatusModalSessionId = number;

export type GenerationStatusModalSubjects = {
  titleSubject: string;
  readyStatementSubject: string;
  descriptionSubject: string;
  waitingTime: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  errorMessage?: string;
  errorActionLabel?: string;
};

export type GenerationStatusModalOpenResult = {
  sessionId: GenerationStatusModalSessionId;
  completion: Promise<GenerationStatusModalClosePayload>;
};

export type UseGenerationStatusModalOptions = {
  overlayId: string;
  overlayOpenStateKey: string;
  sessionStateKey: string;
};

export type UseGenerationStatusModalComposable = {
  openGenerationStatusModal: (
    subjects: GenerationStatusModalSubjects
  ) => GenerationStatusModalOpenResult;
  markGenerationStatusSuccess: (sessionId: GenerationStatusModalSessionId) => void;
  markGenerationStatusError: (sessionId: GenerationStatusModalSessionId) => void;
  closeGenerationStatusModal: () => void;
};

export const useGenerationStatusModal = (
  options: UseGenerationStatusModalOptions
): UseGenerationStatusModalComposable => {
  const overlayOpen = useState<boolean>(options.overlayOpenStateKey, () => false);
  const activeSessionId = useState<number>(options.sessionStateKey, () => 0);

  const generationModalOverlay = useProgrammaticOverlay<
    typeof LazyBaseModalGenerationStatus,
    GenerationStatusModalClosePayload
  >(LazyBaseModalGenerationStatus, {
    id: options.overlayId,
    destroyOnClose: true
  });

  const patchModalState = (state: GenerationStatusModalState): void => {
    generationModalOverlay.patch({ state });
  };

  const closeGenerationStatusModal = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    generationModalOverlay.close();
  };

  const openGenerationStatusModal = (
    subjects: GenerationStatusModalSubjects
  ): GenerationStatusModalOpenResult => {
    if (overlayOpen.value) {
      closeGenerationStatusModal();
    }

    const sessionId = activeSessionId.value + 1;
    activeSessionId.value = sessionId;
    overlayOpen.value = true;

    const completion = generationModalOverlay
      .open({
        state: 'loading',
        ...subjects
      })
      .finally(() => {
        if (activeSessionId.value !== sessionId) {
          return;
        }

        overlayOpen.value = false;
      });

    return {
      sessionId,
      completion
    };
  };

  const markGenerationStatusSuccess = (sessionId: GenerationStatusModalSessionId): void => {
    if (!overlayOpen.value || activeSessionId.value !== sessionId) {
      return;
    }

    patchModalState('success');
  };

  const markGenerationStatusError = (sessionId: GenerationStatusModalSessionId): void => {
    if (!overlayOpen.value || activeSessionId.value !== sessionId) {
      return;
    }

    patchModalState('error');
  };

  return {
    openGenerationStatusModal,
    markGenerationStatusSuccess,
    markGenerationStatusError,
    closeGenerationStatusModal
  };
};
