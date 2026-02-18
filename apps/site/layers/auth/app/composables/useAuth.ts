/**
 * Site Authentication Composable
 *
 * Thin proxy over auth store for convenient access in components.
 * Site-specific: includes profile, terms acceptance, and all auth methods.
 */

import type { LoginInput, Profile, RegisterInput, UserPublic } from '@int/schema';
import type { LocationQuery } from 'vue-router';
import { LazyAuthLegalConsentModal, LazyAuthModal } from '#components';
import { FetchError } from 'ofetch';
import { siteAuthApi } from '../infrastructure/auth.api';

const AUTH_MODAL_OVERLAY_ID = 'site-auth-modal';
const AUTH_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-auth-modal-overlay-open';
const LEGAL_CONSENT_MODAL_OVERLAY_ID = 'site-auth-legal-consent-modal';
const LEGAL_CONSENT_MODAL_OVERLAY_OPEN_STATE_KEY = 'site-auth-legal-consent-modal-overlay-open';

export type AuthModalView = 'login' | 'register' | 'forgot';

export type AuthComposable = {
  loggedIn: ComputedRef<boolean>;
  user: ComputedRef<UserPublic | null>;
  profile: ComputedRef<Profile | null>;
  loading: ComputedRef<boolean>;
  isProfileComplete: ComputedRef<boolean>;
  needsTermsAcceptance: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithLinkedIn: () => void;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  acceptTerms: () => Promise<void>;
  openAuthModal: (view?: AuthModalView, redirect?: string) => void;
  closeAuthModal: () => void;
  closeAuthModalAndRedirect: () => void;
  switchAuthModalView: (view: AuthModalView) => void;
  syncAuthModalFromQuery: (query: LocationQuery) => void;
  syncLegalConsentModal: () => void;
};

export function useAuth(): AuthComposable {
  const store = useAuthStore();
  const { clear, fetch: fetchSession } = useUserSession();
  const route = useRoute();
  const router = useRouter();
  const overlayOpen = useState<boolean>(AUTH_MODAL_OVERLAY_OPEN_STATE_KEY, () => false);
  const legalConsentOverlayOpen = useState<boolean>(
    LEGAL_CONSENT_MODAL_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const authModalOverlay = useProgrammaticOverlay(LazyAuthModal, {
    id: AUTH_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });
  const legalConsentModalOverlay = useProgrammaticOverlay(LazyAuthLegalConsentModal, {
    id: LEGAL_CONSENT_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const authModalRedirectUrl = computed((): string | null =>
    getAuthModalRedirect(route.query.redirect)
  );

  const openOverlay = (): void => {
    if (overlayOpen.value) {
      return;
    }

    overlayOpen.value = true;
    void authModalOverlay.open();
  };

  const closeOverlay = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    authModalOverlay.close();
  };

  const openLegalConsentOverlay = (): void => {
    if (legalConsentOverlayOpen.value) {
      return;
    }

    legalConsentOverlayOpen.value = true;
    void legalConsentModalOverlay.open();
  };

  const closeLegalConsentOverlay = (): void => {
    if (!legalConsentOverlayOpen.value) {
      return;
    }

    legalConsentOverlayOpen.value = false;
    legalConsentModalOverlay.close();
  };

  const logout = async (): Promise<void> => {
    closeLegalConsentOverlay();

    await store.logout().catch((error: unknown) => {
      console.warn('Logout request failed, clearing local session anyway:', error);
    });

    await clear().catch((error: unknown) => {
      if (!(error instanceof FetchError && error.status === 401)) {
        console.warn('Session clear failed:', error);
      }
    });

    await navigateTo('/login');

    // Delay for compensation navigation time
    setTimeout(store.eraseSessionData, 300);
  };

  const loginWithGoogle = (): void => {
    const redirect = getSafeRedirect(route.query.redirect);
    const target = redirect ? `/auth/google?state=${encodeURIComponent(redirect)}` : '/auth/google';
    navigateTo(target, { external: true });
  };

  const loginWithLinkedIn = (): void => {
    const redirect = getSafeRedirect(route.query.redirect);
    const target = redirect
      ? `/auth/linkedin?state=${encodeURIComponent(redirect)}`
      : '/auth/linkedin';
    navigateTo(target, { external: true });
  };

  const register = async (input: RegisterInput): Promise<void> => {
    await store.register(input);
    await fetchSession();
    syncLegalConsentModal();
  };

  const login = async (input: LoginInput): Promise<void> => {
    await store.login(input);
    await fetchSession();
    syncLegalConsentModal();
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await siteAuthApi.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string): Promise<void> => {
    await siteAuthApi.resetPassword(token, password);
  };

  const sendVerification = async (): Promise<void> => {
    await siteAuthApi.sendVerification();
  };

  const refresh = async (): Promise<void> => {
    await store.fetchMe();
    syncLegalConsentModal();
  };

  const acceptTerms = async (): Promise<void> => {
    await store.acceptTerms();
    syncLegalConsentModal();
  };

  const openAuthModal = (newView: AuthModalView = 'login', redirect?: string): void => {
    const query: Record<string, string> = { ...route.query, auth: newView };
    if (redirect) {
      query.redirect = redirect;
    }

    router.push({ query });
  };

  const closeAuthModal = (): void => {
    const { auth: _auth, redirect: _redirect, ...rest } = route.query;
    router.push({ query: rest });
  };

  const closeAuthModalAndRedirect = (): void => {
    const redirect = authModalRedirectUrl.value;
    if (redirect) {
      navigateTo(redirect);
      return;
    }

    closeAuthModal();
  };

  const switchAuthModalView = (newView: AuthModalView): void => {
    router.replace({
      query: { ...route.query, auth: newView }
    });
  };

  const syncAuthModalFromQuery = (query: LocationQuery): void => {
    const view = getAuthModalView(query.auth);
    if (view) {
      openOverlay();
      return;
    }

    closeOverlay();
  };

  function syncLegalConsentModal(): void {
    if (store.needsTermsAcceptance) {
      openLegalConsentOverlay();
      return;
    }

    closeLegalConsentOverlay();
  }

  return {
    loggedIn: computed(() => store.isAuthenticated),
    user: computed(() => store.user),
    profile: computed(() => store.profile),
    loading: computed(() => store.loading),
    isProfileComplete: computed(() => store.isProfileComplete),
    needsTermsAcceptance: computed(() => store.needsTermsAcceptance),
    refresh,
    logout,
    loginWithGoogle,
    loginWithLinkedIn,
    register,
    login,
    forgotPassword,
    resetPassword,
    sendVerification,
    acceptTerms,
    openAuthModal,
    closeAuthModal,
    closeAuthModalAndRedirect,
    switchAuthModalView,
    syncAuthModalFromQuery,
    syncLegalConsentModal
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

function getSafeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  let trimmed: string;
  try {
    trimmed = decodeURIComponent(value).trim();
  } catch {
    return null;
  }

  if (!trimmed || !trimmed.startsWith('/')) {
    return null;
  }

  if (trimmed.startsWith('/auth/google') || trimmed.startsWith('/auth/linkedin')) {
    return null;
  }

  // Block protocol-relative URLs (e.g. //evil.com)
  if (/^\/\//.test(trimmed) || /^[a-z][a-z\d+\-.]*:/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}
