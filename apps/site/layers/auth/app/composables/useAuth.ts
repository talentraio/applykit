/**
 * Site Authentication Composable
 *
 * Thin proxy over auth store for convenient access in components.
 * Site-specific: includes profile, terms acceptance, and all auth methods.
 */

import type { LoginInput, Profile, RegisterInput, UserPublic } from '@int/schema';
import { FetchError } from 'ofetch';
import { siteAuthApi } from '../infrastructure/auth.api';

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
};

export function useAuth(): AuthComposable {
  const store = useAuthStore();
  const { clear, fetch: fetchSession } = useUserSession();
  const route = useRoute();

  const logout = async (): Promise<void> => {
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
  };

  const login = async (input: LoginInput): Promise<void> => {
    await store.login(input);
    await fetchSession();
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
  };

  const acceptTerms = async (): Promise<void> => {
    await store.acceptTerms();
  };

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
    acceptTerms
  };
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
