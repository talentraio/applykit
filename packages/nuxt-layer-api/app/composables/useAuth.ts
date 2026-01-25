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

  /**
   * Logout and redirect to login page
   */
  const logout = async (): Promise<void> => {
    try {
      // Call store logout action (handles API call)
      await store.logout();

      // Clear client-side session (nuxt-auth-utils)
      await clear();

      // Redirect to login
      await navigateTo('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  /**
   * Navigate to Google OAuth login
   * Note: OAuth routes are in server/routes/, not server/api/
   */
  const loginWithGoogle = (): void => {
    navigateTo('/auth/google', { external: true });
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
