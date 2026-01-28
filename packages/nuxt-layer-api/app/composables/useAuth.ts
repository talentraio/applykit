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
    loginWithGoogle
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

  if (hasProtocol(trimmed, { acceptRelative: true })) {
    return null;
  }

  return trimmed;
}
