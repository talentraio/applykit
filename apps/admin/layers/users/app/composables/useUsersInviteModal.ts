import type { Role } from '@int/schema';
import { LazyUsersModalUserInvite } from '#components';

const USERS_INVITE_MODAL_OVERLAY_ID = 'admin-users-invite-modal';
const USERS_INVITE_MODAL_OVERLAY_OPEN_STATE_KEY = 'admin-users-invite-modal-overlay-open';

type UsersInviteSubmitPayload = {
  email: string;
  role: Role;
};

export type UsersInviteModalClosePayload = { action: 'cancelled' } | { action: 'submitted' };

export type OpenUsersInviteModalOptions = {
  onSubmit: (payload: UsersInviteSubmitPayload) => Promise<boolean> | boolean;
};

export type UseUsersInviteModalComposable = {
  openInviteModal: (
    options: OpenUsersInviteModalOptions
  ) => Promise<UsersInviteModalClosePayload | undefined>;
  closeInviteModal: () => void;
};

export function useUsersInviteModal(): UseUsersInviteModalComposable {
  const overlayOpen = useState<boolean>(USERS_INVITE_MODAL_OVERLAY_OPEN_STATE_KEY, () => false);
  const inviteOverlay = useProgrammaticOverlay<
    typeof LazyUsersModalUserInvite,
    UsersInviteModalClosePayload | undefined
  >(LazyUsersModalUserInvite, {
    id: USERS_INVITE_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeInviteModal = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    inviteOverlay.close({ action: 'cancelled' });
  };

  const openInviteModal = async (
    options: OpenUsersInviteModalOptions
  ): Promise<UsersInviteModalClosePayload | undefined> => {
    if (overlayOpen.value) {
      return undefined;
    }

    let isSubmitting = false;

    const handleSubmit = async (payload: UsersInviteSubmitPayload) => {
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      inviteOverlay.patch({ loading: true });

      const isSuccess = await options.onSubmit(payload);
      if (isSuccess) {
        inviteOverlay.close({ action: 'submitted' });
        return;
      }

      isSubmitting = false;
      inviteOverlay.patch({ loading: false });
    };

    overlayOpen.value = true;

    try {
      return await inviteOverlay.open({
        loading: false,
        onSubmit: (payload: UsersInviteSubmitPayload) => {
          void handleSubmit(payload);
        }
      });
    } finally {
      overlayOpen.value = false;
    }
  };

  return {
    openInviteModal,
    closeInviteModal
  };
}
