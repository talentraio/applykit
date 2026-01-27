import type { Profile, Role, UserPublic } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';
import { authApi } from '@layer/api/app/infrastructure/auth.api';

/**
 * Auth Store
 *
 * Manages authentication state and user session.
 * Used by both site and admin apps via @layer/api package.
 *
 * TR004 - Implemented as part of architecture refactoring
 */
export const useApiAuthStore = defineStore('ApiAuthStore', {
  state: (): {
    user: UserPublic | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
  } => ({
    user: null,
    profile: null,
    loading: false,
    initialized: false
  }),

  getters: {
    /**
     * Check if user is authenticated
     */
    isAuthenticated: (state): boolean => !!state.user,

    /**
     * Check if profile is complete (has all required fields)
     */
    isProfileComplete: (state): boolean => {
      if (!state.profile) return false;

      return (
        state.profile.firstName.length > 0 &&
        state.profile.lastName.length > 0 &&
        state.profile.email.length > 0 &&
        state.profile.country.length === 2 &&
        state.profile.searchRegion.length > 0 &&
        state.profile.languages.length > 0
      );
    },

    /**
     * Get user role (defaults to 'public' if not authenticated)
     */
    userRole: (state): Role => {
      return state.user?.role ?? USER_ROLE_MAP.PUBLIC;
    }
  },

  actions: {
    /**
     * Fetch current user and profile from server
     * Called on SSR init and after login
     * Returns data for useAsyncData compatibility
     */
    async fetchMe() {
      this.loading = true;

      try {
        const { user, profile } = await authApi.fetchMe();
        this.user = user;
        this.profile = profile;
        this.initialized = true;
        return { user, profile };
      } catch (error) {
        // Not authenticated or error - reset state
        this.user = null;
        this.profile = null;
        this.initialized = true;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Logout current user
     * Clears server session and local state
     */
    async logout() {
      this.loading = true;

      try {
        await authApi.logout();
      } finally {
        // Always clear local state, even if API fails
        this.user = null;
        this.profile = null;
        this.loading = false;
      }
    },

    /**
     * Update profile in store (after save)
     */
    setProfile(profile: Profile) {
      this.profile = profile;
    },

    /**
     * Reset store state
     * Called on logout or session clear
     */
    $reset() {
      this.user = null;
      this.profile = null;
      this.loading = false;
      this.initialized = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useApiAuthStore, import.meta.hot));
}
