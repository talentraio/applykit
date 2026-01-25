/**
 * Profile Composable
 *
 * Thin proxy over stores for convenient profile access in components.
 * Does NOT hold state - profile state lives in useApiAuthStore.
 *
 * T088 [US3] useProfile composable
 * TR008 - Refactored to use store instead of direct $fetch
 *         Moved from @int/api to site/layers/profile (site-specific)
 */

import type { Profile, ProfileInput } from '@int/schema';
import { useApiAuthStore } from '@layer/api/app/stores/auth';

export type UseProfileReturn = {
  /**
   * User profile (from auth store, null if not created yet)
   */
  profile: ComputedRef<Profile | null>;

  /**
   * Profile completeness status
   */
  isComplete: ComputedRef<boolean>;

  /**
   * Loading state
   */
  loading: ComputedRef<boolean>;

  /**
   * Error state
   */
  error: ComputedRef<Error | null>;

  /**
   * Create or update profile
   */
  saveProfile: (data: ProfileInput) => Promise<Profile>;

  /**
   * Check if profile is complete (server-side check)
   */
  checkCompleteness: () => Promise<boolean>;
};

export function useProfile(): UseProfileReturn {
  const authStore = useApiAuthStore();
  const profileStore = useProfileStore();

  return {
    // Profile from auth store (loaded during init)
    profile: computed(() => authStore.profile),

    // Completeness check from auth store getter
    isComplete: computed(() => authStore.isProfileComplete),

    // Loading and error from profile store (for save operations)
    loading: computed(() => profileStore.loading),
    error: computed(() => profileStore.error),

    // Save goes through profile store (updates auth store internally)
    saveProfile: (data: ProfileInput) => profileStore.saveProfile(data),

    // Completeness check via profile store
    checkCompleteness: () => profileStore.checkProfileCompleteness()
  };
}
