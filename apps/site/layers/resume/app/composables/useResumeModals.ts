import type { Resume } from '@int/schema';
import { LazyResumeModalCreateFromScratch, LazyResumeModalUpload } from '#components';

const RESUME_UPLOAD_MODAL_OVERLAY_ID = 'site-resume-upload-modal';
const RESUME_UPLOAD_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-resume-upload-modal-overlay-open';
const RESUME_CREATE_MODAL_OVERLAY_ID = 'site-resume-create-modal';
const RESUME_CREATE_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-resume-create-modal-overlay-open';

export type ResumeUploadModalClosePayload =
  | { action: 'uploaded'; resume: Resume }
  | { action: 'create-from-scratch' };

export type OpenResumeUploadModalOptions = {
  onError?: (error: Error) => void;
};

export type UseResumeModalsComposable = {
  openUploadModal: (
    options?: OpenResumeUploadModalOptions
  ) => Promise<ResumeUploadModalClosePayload | undefined>;
  openUploadFlow: (options?: OpenResumeUploadModalOptions) => Promise<void>;
  closeUploadModal: () => void;
  openCreateFromScratchModal: () => Promise<void>;
  closeCreateFromScratchModal: () => void;
};

export function useResumeModals(): UseResumeModalsComposable {
  const uploadOverlayOpen = useState<boolean>(
    RESUME_UPLOAD_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const createOverlayOpen = useState<boolean>(
    RESUME_CREATE_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const uploadModalOverlay = useProgrammaticOverlay<
    typeof LazyResumeModalUpload,
    ResumeUploadModalClosePayload | undefined
  >(LazyResumeModalUpload, {
    id: RESUME_UPLOAD_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });
  const createModalOverlay = useProgrammaticOverlay(LazyResumeModalCreateFromScratch, {
    id: RESUME_CREATE_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeUploadModal = (): void => {
    if (!uploadOverlayOpen.value) {
      return;
    }

    uploadOverlayOpen.value = false;
    uploadModalOverlay.close();
  };

  const closeCreateFromScratchModal = (): void => {
    if (!createOverlayOpen.value) {
      return;
    }

    createOverlayOpen.value = false;
    createModalOverlay.close();
  };

  const openUploadModal = async (
    options: OpenResumeUploadModalOptions = {}
  ): Promise<ResumeUploadModalClosePayload | undefined> => {
    if (uploadOverlayOpen.value) {
      return undefined;
    }

    uploadOverlayOpen.value = true;

    try {
      return await uploadModalOverlay.open({
        onError: options.onError
      });
    } finally {
      uploadOverlayOpen.value = false;
    }
  };

  const openCreateFromScratchModal = async (): Promise<void> => {
    if (createOverlayOpen.value) {
      return;
    }

    createOverlayOpen.value = true;

    try {
      await createModalOverlay.open();
    } finally {
      createOverlayOpen.value = false;
    }
  };

  const openUploadFlow = async (options: OpenResumeUploadModalOptions = {}): Promise<void> => {
    const result = await openUploadModal(options);
    if (result?.action === 'create-from-scratch') {
      await openCreateFromScratchModal();
    }
  };

  return {
    openUploadModal,
    openUploadFlow,
    closeUploadModal,
    openCreateFromScratchModal,
    closeCreateFromScratchModal
  };
}
