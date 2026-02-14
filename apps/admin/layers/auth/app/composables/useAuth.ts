/**
 * Admin Authentication Composable
 *
 * Minimal auth composable for admin app.
 * Only provides login, logout, user, and loading state.
 */

import type { UserPublic } from '@int/schema';
import { FetchError } from 'ofetch';

export type AdminAuthComposable = {
  loggedIn: ComputedRef<boolean>;
  user: ComputedRef<UserPublic | null>;
  loading: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
};

export function useAuth(): AdminAuthComposable {
  const store = useAuthStore();
  const { clear } = useUserSession();

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
  };

  const loginWithGoogle = (): void => {
    navigateTo('/auth/google', { external: true });
  };

  const refresh = async (): Promise<void> => {
    await store.fetchMe();
  };

  return {
    loggedIn: computed(() => store.isAuthenticated),
    user: computed(() => store.user),
    loading: computed(() => store.loading),
    refresh,
    logout,
    loginWithGoogle
  };
}
