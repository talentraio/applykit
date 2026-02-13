import type { Profile, UserPublic } from '@int/schema';

const authUrl = '/api/auth';

/**
 * Auth API response type for /api/auth/me
 * Returns user data and profile (if exists)
 */
export type AuthMeResponse = {
  user: UserPublic;
  profile: Profile | null;
  isProfileComplete: boolean;
};

/**
 * Authentication API
 *
 * Handles auth-related API calls.
 * Used by auth store actions.
 */
export const authApi = {
  /**
   * Fetch current user and profile
   * Called on app init and after login
   */
  async fetchMe(): Promise<AuthMeResponse> {
    return useApi(`${authUrl}/me`, {
      method: 'GET'
    });
  },

  /**
   * Logout current user
   * Clears server session
   */
  async logout(): Promise<void> {
    useApi(`${authUrl}/logout`, {
      method: 'POST'
    });
  }
};
