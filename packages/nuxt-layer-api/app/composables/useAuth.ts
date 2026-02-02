/**
 * Authentication Composable
 *
 * Thin proxy over auth store for convenient access in components.
 * Does NOT hold state - all state lives in useApiAuthStore.
 *
 * T063 [US1] useAuth composable
 * TR006 - Refactored to use store instead of direct $fetch
 */

import type { Profile, UserPublic } from '@int/schema';
import { FetchError } from 'ofetch';
import { decode, hasLeadingSlash, hasProtocol } from 'ufo';
import { useApiAuthStore } from '../stores/auth';

export type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthComposable = {
  /**
   * Computed indicating if the user is logged in
   */
  loggedIn: ComputedRef<boolean>;
  /**
   * The current user object if logged in, null otherwise
   */
  user: ComputedRef<UserPublic | null>;
  /**
   * The current profile object if exists, null otherwise
   */
  profile: ComputedRef<Profile | null>;
  /**
   * Loading state
   */
  loading: ComputedRef<boolean>;
  /**
   * Check if profile is complete
   */
  isProfileComplete: ComputedRef<boolean>;
  /**
   * Fetch/refresh the user session from the server
   */
  refresh: () => Promise<void>;
  /**
   * Logout the current user
   */
  logout: () => Promise<void>;
  /**
   * Navigate to Google OAuth login
   */
  loginWithGoogle: () => void;
  /**
   * Navigate to LinkedIn OAuth login
   */
  loginWithLinkedIn: () => void;
  /**
   * Register with email/password
   */
  register: (input: RegisterInput) => Promise<void>;
  /**
   * Login with email/password
   */
  login: (input: LoginInput) => Promise<void>;
  /**
   * Request password reset
   */
  forgotPassword: (email: string) => Promise<void>;
  /**
   * Reset password with token
   */
  resetPassword: (token: string, password: string) => Promise<void>;
  /**
   * Send email verification
   */
  sendVerification: () => Promise<void>;
};

export function useAuth(): AuthComposable {
  const store = useApiAuthStore();
  const { clear } = useUserSession();
  const route = useRoute();

  /**
   * Logout and redirect to login page
   */
  const logout = async (): Promise<void> => {
    // Call store logout action (handles API call)
    try {
      await store.logout();
    } catch (error) {
      console.warn('Logout request failed, clearing local session anyway:', error);
    }

    // Clear client-side session (nuxt-auth-utils)
    try {
      await clear();
    } catch (error) {
      if (!(error instanceof FetchError && error.status === 401)) {
        console.warn('Session clear failed:', error);
      }
    }

    // Redirect to login regardless of server response
    await navigateTo('/login');
  };

  /**
   * Navigate to Google OAuth login
   * Note: OAuth routes are in server/routes/, not server/api/
   */
  const loginWithGoogle = (): void => {
    const redirect = getSafeRedirect(route.query.redirect);
    const target = redirect ? `/auth/google?state=${encodeURIComponent(redirect)}` : '/auth/google';
    navigateTo(target, { external: true });
  };

  /**
   * Navigate to LinkedIn OAuth login
   */
  const loginWithLinkedIn = (): void => {
    const redirect = getSafeRedirect(route.query.redirect);
    const target = redirect
      ? `/auth/linkedin?state=${encodeURIComponent(redirect)}`
      : '/auth/linkedin';
    navigateTo(target, { external: true });
  };

  /**
   * Register with email/password
   */
  const register = async (input: RegisterInput): Promise<void> => {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: input
    });
    // Refresh to get new user data
    await store.fetchMe();
  };

  /**
   * Login with email/password
   */
  const login = async (input: LoginInput): Promise<void> => {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: input
    });
    // Refresh to get user data
    await store.fetchMe();
  };

  /**
   * Request password reset
   */
  const forgotPassword = async (email: string): Promise<void> => {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
  };

  /**
   * Reset password with token
   */
  const resetPassword = async (token: string, password: string): Promise<void> => {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password }
    });
  };

  /**
   * Send email verification
   */
  const sendVerification = async (): Promise<void> => {
    await $fetch('/api/auth/send-verification', {
      method: 'POST'
    });
  };

  /**
   * Refresh user session from server
   */
  const refresh = async (): Promise<void> => {
    await store.fetchMe();
  };

  return {
    loggedIn: computed(() => store.isAuthenticated),
    user: computed(() => store.user),
    profile: computed(() => store.profile),
    loading: computed(() => store.loading),
    isProfileComplete: computed(() => store.isProfileComplete),
    refresh,
    logout,
    loginWithGoogle,
    loginWithLinkedIn,
    register,
    login,
    forgotPassword,
    resetPassword,
    sendVerification
  };
}

function getSafeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = decode(value).trim();
  if (!trimmed || !hasLeadingSlash(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('/auth/google') || trimmed.startsWith('/auth/linkedin')) {
    return null;
  }

  if (hasProtocol(trimmed, { acceptRelative: true })) {
    return null;
  }

  return trimmed;
}
