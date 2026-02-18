import { LazyProfileIncompleteModal } from '#components';

const PROFILE_INCOMPLETE_MODAL_OVERLAY_ID = 'site-profile-incomplete-modal';
const PROFILE_INCOMPLETE_MODAL_OVERLAY_OPEN_STATE_KEY =
  'site-profile-incomplete-modal-overlay-open';

export type ProfileIncompleteModalClosePayload = { action: 'cancelled' } | { action: 'navigated' };

export type OpenProfileIncompleteModalOptions = {
  returnTo?: string;
};

export type UseProfileIncompleteModalComposable = {
  openProfileIncompleteModal: (
    options?: OpenProfileIncompleteModalOptions
  ) => Promise<ProfileIncompleteModalClosePayload | undefined>;
  closeProfileIncompleteModal: () => void;
};

export function useProfileIncompleteModal(): UseProfileIncompleteModalComposable {
  const overlayOpen = useState<boolean>(
    PROFILE_INCOMPLETE_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const profileIncompleteModalOverlay = useProgrammaticOverlay<
    typeof LazyProfileIncompleteModal,
    ProfileIncompleteModalClosePayload | undefined
  >(LazyProfileIncompleteModal, {
    id: PROFILE_INCOMPLETE_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeProfileIncompleteModal = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    profileIncompleteModalOverlay.close();
  };

  const openProfileIncompleteModal = async (
    options: OpenProfileIncompleteModalOptions = {}
  ): Promise<ProfileIncompleteModalClosePayload | undefined> => {
    if (overlayOpen.value) {
      return undefined;
    }

    overlayOpen.value = true;

    try {
      return await profileIncompleteModalOverlay.open({
        returnTo: options.returnTo
      });
    } finally {
      overlayOpen.value = false;
    }
  };

  return {
    openProfileIncompleteModal,
    closeProfileIncompleteModal
  };
}
