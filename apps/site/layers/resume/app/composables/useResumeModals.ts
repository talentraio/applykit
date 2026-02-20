import type { Resume } from '@int/schema';
import {
  LazyResumeEditorModalDeleteConfirm,
  LazyResumeModalCreateFromScratch,
  LazyResumeModalUpload
} from '#components';

const RESUME_UPLOAD_MODAL_OVERLAY_ID = 'site-resume-upload-modal';
const RESUME_UPLOAD_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-resume-upload-modal-overlay-open';
const RESUME_CREATE_MODAL_OVERLAY_ID = 'site-resume-create-modal';
const RESUME_CREATE_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-resume-create-modal-overlay-open';
const RESUME_DELETE_CONFIRM_MODAL_OVERLAY_ID = 'site-resume-delete-confirm-modal';
const RESUME_DELETE_CONFIRM_MODAL_OVERLAY_OPEN_STATE_KEY =
  'site-resume-delete-confirm-modal-overlay-open';

export type ResumeUploadModalClosePayload =
  | { action: 'uploaded'; resume: Resume }
  | { action: 'create-from-scratch'; title?: string };
export type ResumeDeleteConfirmModalClosePayload =
  | { action: 'confirmed' }
  | { action: 'cancelled' };

export type OpenResumeUploadModalOptions = {
  onError?: (error: Error) => void;
  replaceResumeId?: string;
};

export type OpenCreateFromScratchModalOptions = {
  replaceResumeId?: string;
  title?: string;
};

export type UseResumeModalsComposable = {
  openUploadModal: (
    options?: OpenResumeUploadModalOptions
  ) => Promise<ResumeUploadModalClosePayload | undefined>;
  openUploadFlow: (options?: OpenResumeUploadModalOptions) => Promise<void>;
  closeUploadModal: () => void;
  openCreateFromScratchModal: (options?: OpenCreateFromScratchModalOptions) => Promise<void>;
  closeCreateFromScratchModal: () => void;
  openDeleteConfirmModal: () => Promise<ResumeDeleteConfirmModalClosePayload | undefined>;
  closeDeleteConfirmModal: () => void;
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
  const deleteConfirmOverlayOpen = useState<boolean>(
    RESUME_DELETE_CONFIRM_MODAL_OVERLAY_OPEN_STATE_KEY,
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
  const deleteConfirmOverlay = useProgrammaticOverlay<
    typeof LazyResumeEditorModalDeleteConfirm,
    ResumeDeleteConfirmModalClosePayload | undefined
  >(LazyResumeEditorModalDeleteConfirm, {
    id: RESUME_DELETE_CONFIRM_MODAL_OVERLAY_ID,
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

  const closeDeleteConfirmModal = (): void => {
    if (!deleteConfirmOverlayOpen.value) {
      return;
    }

    deleteConfirmOverlayOpen.value = false;
    deleteConfirmOverlay.close();
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
        onError: options.onError,
        replaceResumeId: options.replaceResumeId
      });
    } finally {
      uploadOverlayOpen.value = false;
    }
  };

  const openCreateFromScratchModal = async (
    options: OpenCreateFromScratchModalOptions = {}
  ): Promise<void> => {
    if (createOverlayOpen.value) {
      return;
    }

    createOverlayOpen.value = true;

    try {
      await createModalOverlay.open({
        replaceResumeId: options.replaceResumeId,
        title: options.title
      });
    } finally {
      createOverlayOpen.value = false;
    }
  };

  const openDeleteConfirmModal = async (): Promise<
    ResumeDeleteConfirmModalClosePayload | undefined
  > => {
    if (deleteConfirmOverlayOpen.value) {
      return undefined;
    }

    deleteConfirmOverlayOpen.value = true;

    try {
      return await deleteConfirmOverlay.open();
    } finally {
      deleteConfirmOverlayOpen.value = false;
    }
  };

  const openUploadFlow = async (options: OpenResumeUploadModalOptions = {}): Promise<void> => {
    const result = await openUploadModal(options);
    if (result?.action === 'create-from-scratch') {
      await openCreateFromScratchModal({
        replaceResumeId: options.replaceResumeId,
        title: result.title
      });
    }
  };

  return {
    openUploadModal,
    openUploadFlow,
    closeUploadModal,
    openCreateFromScratchModal,
    closeCreateFromScratchModal,
    openDeleteConfirmModal,
    closeDeleteConfirmModal
  };
}
