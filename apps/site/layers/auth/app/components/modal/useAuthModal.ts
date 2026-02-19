import type { AuthModalView as AuthModalViewType } from '../../composables/useAuth';

export type AuthModalView = AuthModalViewType;

export type AuthModalComposable = {
  isOpen: ComputedRef<boolean>;
  view: ComputedRef<AuthModalView | null>;
  redirectUrl: ComputedRef<string | null>;
  close: () => void;
  closeAndRedirect: () => void;
  switchView: (view: AuthModalView) => void;
};

export function useAuthModal(): AuthModalComposable {
  const route = useRoute();
  const { closeAuthModal, closeAuthModalAndRedirect, switchAuthModalView } = useAuth();

  const view = computed((): AuthModalView | null => getAuthModalView(route.query.auth));

  const isOpen = computed(() => view.value !== null);

  const redirectUrl = computed((): string | null => getAuthModalRedirect(route.query.redirect));

  return {
    isOpen,
    view,
    redirectUrl,
    close: closeAuthModal,
    closeAndRedirect: closeAuthModalAndRedirect,
    switchView: switchAuthModalView
  };
}

function getAuthModalView(value: unknown): AuthModalView | null {
  if (value === 'login' || value === 'register' || value === 'forgot') {
    return value;
  }

  return null;
}

function getAuthModalRedirect(value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('/')) {
    return value;
  }

  return null;
}
