import {
  LazyVacancyModalBulkDeleteConfirmation,
  LazyVacancyModalDeleteConfirmation
} from '#components';

const VACANCY_DELETE_MODAL_OVERLAY_ID = 'site-vacancy-delete-modal';
const VACANCY_DELETE_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-vacancy-delete-modal-overlay-open';
const VACANCY_BULK_DELETE_MODAL_OVERLAY_ID = 'site-vacancy-bulk-delete-modal';
const VACANCY_BULK_DELETE_MODAL_OVERLAY_OPEN_STATE_KEY =
  'site-vacancy-bulk-delete-modal-overlay-open';

export type VacancyDeleteModalClosePayload =
  | { action: 'deleted'; vacancyId: string }
  | { action: 'cancelled' };

export type VacancyBulkDeleteModalClosePayload =
  | { action: 'deleted'; vacancyIds: string[] }
  | { action: 'cancelled' };

export type UseVacancyModalsComposable = {
  openDeleteConfirmationModal: (
    vacancyId: string
  ) => Promise<VacancyDeleteModalClosePayload | undefined>;
  closeDeleteConfirmationModal: () => void;
  openBulkDeleteConfirmationModal: (
    vacancyIds: string[]
  ) => Promise<VacancyBulkDeleteModalClosePayload | undefined>;
  closeBulkDeleteConfirmationModal: () => void;
};

export function useVacancyModals(): UseVacancyModalsComposable {
  const deleteOverlayOpen = useState<boolean>(
    VACANCY_DELETE_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const bulkDeleteOverlayOpen = useState<boolean>(
    VACANCY_BULK_DELETE_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );

  const deleteOverlay = useProgrammaticOverlay<
    typeof LazyVacancyModalDeleteConfirmation,
    VacancyDeleteModalClosePayload | undefined
  >(LazyVacancyModalDeleteConfirmation, {
    id: VACANCY_DELETE_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });
  const bulkDeleteOverlay = useProgrammaticOverlay<
    typeof LazyVacancyModalBulkDeleteConfirmation,
    VacancyBulkDeleteModalClosePayload | undefined
  >(LazyVacancyModalBulkDeleteConfirmation, {
    id: VACANCY_BULK_DELETE_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeDeleteConfirmationModal = (): void => {
    if (!deleteOverlayOpen.value) {
      return;
    }

    deleteOverlayOpen.value = false;
    deleteOverlay.close();
  };

  const closeBulkDeleteConfirmationModal = (): void => {
    if (!bulkDeleteOverlayOpen.value) {
      return;
    }

    bulkDeleteOverlayOpen.value = false;
    bulkDeleteOverlay.close();
  };

  const openDeleteConfirmationModal = async (
    vacancyId: string
  ): Promise<VacancyDeleteModalClosePayload | undefined> => {
    if (deleteOverlayOpen.value || !vacancyId) {
      return undefined;
    }

    deleteOverlayOpen.value = true;

    try {
      return await deleteOverlay.open({
        vacancyId
      });
    } finally {
      deleteOverlayOpen.value = false;
    }
  };

  const openBulkDeleteConfirmationModal = async (
    vacancyIds: string[]
  ): Promise<VacancyBulkDeleteModalClosePayload | undefined> => {
    if (bulkDeleteOverlayOpen.value || vacancyIds.length === 0) {
      return undefined;
    }

    bulkDeleteOverlayOpen.value = true;

    try {
      return await bulkDeleteOverlay.open({
        vacancyIds
      });
    } finally {
      bulkDeleteOverlayOpen.value = false;
    }
  };

  return {
    openDeleteConfirmationModal,
    closeDeleteConfirmationModal,
    openBulkDeleteConfirmationModal,
    closeBulkDeleteConfirmationModal
  };
}
