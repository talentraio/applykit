import type { Role, UserPublic } from '@int/schema';
import { USER_ROLE_MAP } from '@int/schema';
import { adminAuthApi } from '../infrastructure/auth.api';

/**
 * Admin Auth Store
 *
 * Manages authentication state for the admin app.
 * Minimal: no profile, no terms tracking.
 */
export const useAuthStore = defineStore('AuthStore', {
  state: (): {
    user: UserPublic | null;
    loading: boolean;
    initialized: boolean;
  } => ({
    user: null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,

    userRole: (state): Role => {
      return state.user?.role ?? USER_ROLE_MAP.PUBLIC;
    }
  },

  actions: {
    async fetchMe() {
      this.loading = true;

      try {
        const { user } = await adminAuthApi.fetchMe();
        this.user = user;
        this.initialized = true;
        return { user };
      } catch (error) {
        this.user = null;
        this.initialized = true;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;

      try {
        await adminAuthApi.logout();
      } finally {
        this.user = null;
        this.loading = false;
      }
    },

    $reset() {
      this.user = null;
      this.loading = false;
      this.initialized = false;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
