/**
 * Auth Modal Composable
 *
 * Manages auth modal state with URL synchronization.
 * Supports login, register, and forgot password views.
 *
 * Feature: 003-auth-expansion
 */

export type AuthModalView = 'login' | 'register' | 'forgot';

export type AuthModalComposable = {
  /**
   * Whether the modal is open
   */
  isOpen: ComputedRef<boolean>;
  /**
   * Current view in the modal
   */
  view: ComputedRef<AuthModalView | null>;
  /**
   * Open the modal with specified view
   */
  open: (view?: AuthModalView) => void;
  /**
   * Close the modal
   */
  close: () => void;
  /**
   * Switch to a different view
   */
  switchView: (view: AuthModalView) => void;
};

export function useAuthModal(): AuthModalComposable {
  const route = useRoute();
  const router = useRouter();

  /**
   * Current view from URL query
   */
  const view = computed((): AuthModalView | null => {
    const authQuery = route.query.auth;
    if (authQuery === 'login' || authQuery === 'register' || authQuery === 'forgot') {
      return authQuery;
    }
    return null;
  });

  /**
   * Whether modal is open
   */
  const isOpen = computed(() => view.value !== null);

  /**
   * Open modal with specified view
   */
  const open = (newView: AuthModalView = 'login'): void => {
    router.push({
      query: { ...route.query, auth: newView }
    });
  };

  /**
   * Close modal
   */
  const close = (): void => {
    const { auth: _auth, ...rest } = route.query;
    router.push({ query: rest });
  };

  /**
   * Switch to a different view
   */
  const switchView = (newView: AuthModalView): void => {
    router.replace({
      query: { ...route.query, auth: newView }
    });
  };

  return {
    isOpen,
    view,
    open,
    close,
    switchView
  };
}
