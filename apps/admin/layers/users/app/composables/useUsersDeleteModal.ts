import { LazyUsersModalDeleteConfirm } from '#components';

const USERS_DELETE_CONFIRM_MODAL_OVERLAY_ID = 'admin-users-delete-confirm-modal';
const USERS_DELETE_CONFIRM_MODAL_OVERLAY_OPEN_STATE_KEY =
  'admin-users-delete-confirm-modal-overlay-open';

type UsersDeleteMode = 'soft' | 'hard';

export type UsersDeleteConfirmModalClosePayload = { action: 'cancelled' } | { action: 'confirmed' };

export type OpenUsersDeleteConfirmModalOptions = {
  mode: UsersDeleteMode;
  onConfirm: () => Promise<boolean> | boolean;
};

export type UseUsersDeleteModalComposable = {
  openDeleteConfirmModal: (
    options: OpenUsersDeleteConfirmModalOptions
  ) => Promise<UsersDeleteConfirmModalClosePayload | undefined>;
  closeDeleteConfirmModal: () => void;
};

export function useUsersDeleteModal(): UseUsersDeleteModalComposable {
  const { t } = useI18n();
  const overlayOpen = useState<boolean>(
    USERS_DELETE_CONFIRM_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const deleteConfirmOverlay = useProgrammaticOverlay<
    typeof LazyUsersModalDeleteConfirm,
    UsersDeleteConfirmModalClosePayload | undefined
  >(LazyUsersModalDeleteConfirm, {
    id: USERS_DELETE_CONFIRM_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeDeleteConfirmModal = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    deleteConfirmOverlay.close({ action: 'cancelled' });
  };

  const openDeleteConfirmModal = async (
    options: OpenUsersDeleteConfirmModalOptions
  ): Promise<UsersDeleteConfirmModalClosePayload | undefined> => {
    if (overlayOpen.value) {
      return undefined;
    }

    let isConfirming = false;

    const title =
      options.mode === 'hard' ? t('admin.users.hardDelete.title') : t('admin.users.delete.title');
    const description =
      options.mode === 'hard'
        ? t('admin.users.hardDelete.description')
        : t('admin.users.delete.description');
    const confirmLabel =
      options.mode === 'hard'
        ? t('admin.users.hardDelete.confirm')
        : t('admin.users.delete.confirm');

    const handleConfirm = async () => {
      if (isConfirming) {
        return;
      }

      isConfirming = true;
      deleteConfirmOverlay.patch({ loading: true });

      const isSuccess = await options.onConfirm();
      if (isSuccess) {
        deleteConfirmOverlay.close({ action: 'confirmed' });
        return;
      }

      isConfirming = false;
      deleteConfirmOverlay.patch({ loading: false });
    };

    overlayOpen.value = true;

    try {
      return await deleteConfirmOverlay.open({
        loading: false,
        title,
        description,
        confirmLabel,
        onConfirm: () => {
          void handleConfirm();
        }
      });
    } finally {
      overlayOpen.value = false;
    }
  };

  return {
    openDeleteConfirmModal,
    closeDeleteConfirmModal
  };
}
