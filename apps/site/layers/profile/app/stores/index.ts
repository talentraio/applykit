import type { Profile, ProfileInput } from '@int/schema';
import { profileApi } from '@site/profile/app/infrastructure/profile.api';

/**
 * Profile Store
 *
 * Manages user profile operations.
 * Site-specific - uses user.api.ts from @int/api layer.
 *
 * TR005 - Refactored from useUserStore (split from resume logic)
 */
export const useProfileStore = defineStore('ProfileStore', {
  state: (): {
    loading: boolean;
    error: Error | null;
  } => ({
    loading: false,
    error: null
  }),

  actions: {
    /**
     * Save (create or update) profile
     * Also updates auth store profile
     */
    async saveProfile(data: ProfileInput): Promise<Profile> {
      this.loading = true;
      this.error = null;

      try {
        const profile = await profileApi.saveProfileApi(data);

        // Update auth store with new profile
        const authStore = useAuthStore();
        authStore.setProfile(profile);

        return profile;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to save profile');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Check if profile is complete — refreshes from server via fetchMe
     */
    async checkProfileCompleteness(): Promise<boolean> {
      try {
        const authStore = useAuthStore();
        await authStore.fetchMe();
        return authStore.isProfileComplete;
      } catch {
        return false;
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.loading = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProfileStore, import.meta.hot));
}
