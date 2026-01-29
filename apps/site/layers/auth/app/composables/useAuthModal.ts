/**
 * Auth Modal Composable
 *
 * Manages auth modal state with URL synchronization.
 * Supports login, register, and forgot password views.
 * Supports redirect parameter for post-login navigation.
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
   * Redirect URL after successful login (from query param)
   */
  redirectUrl: ComputedRef<string | null>;
  /**
   * Open the modal with specified view and optional redirect
   */
  open: (view?: AuthModalView, redirect?: string) => void;
  /**
   * Close the modal (clears auth query params)
   */
  close: () => void;
  /**
   * Close modal and navigate to redirect URL if present
   */
  closeAndRedirect: () => void;
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
   * Redirect URL from query (used after successful login)
   */
  const redirectUrl = computed((): string | null => {
    const redirect = route.query.redirect;
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      return redirect;
    }
    return null;
  });

  /**
   * Open modal with specified view and optional redirect
   */
  const open = (newView: AuthModalView = 'login', redirect?: string): void => {
    const query: Record<string, string> = { ...route.query, auth: newView };
    if (redirect) {
      query.redirect = redirect;
    }
    router.push({ query });
  };

  /**
   * Close modal (clears auth query params but keeps redirect for OAuth)
   */
  const close = (): void => {
    const { auth: _auth, redirect: _redirect, ...rest } = route.query;
    router.push({ query: rest });
  };

  /**
   * Close modal and navigate to redirect URL if present
   */
  const closeAndRedirect = (): void => {
    const redirect = redirectUrl.value;
    if (redirect) {
      navigateTo(redirect);
    } else {
      close();
    }
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
    redirectUrl,
    open,
    close,
    closeAndRedirect,
    switchView
  };
}
