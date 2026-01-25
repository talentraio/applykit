import type { Profile, ProfileInput } from '@int/schema';

const profileUrl = '/api/profile';

/**
 * Profile API
 *
 * Handles profile-related API calls.
 * Used by auth/user store actions.
 */
export const profileApi = {
  /**
   * Fetch current user's profile
   */
  async fetchProfileApi(): Promise<Profile | null> {
    return await useApi(profileUrl, {
      method: 'GET'
    });
  },

  /**
   * Create or update profile
   */
  async saveProfileApi(data: ProfileInput): Promise<Profile> {
    return await useApi(profileUrl, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Check if profile is complete (has all required fields)
   */
  async checkCompletenessApi(): Promise<boolean> {
    const response = await useApi(`${profileUrl}/complete`, {
      method: 'GET'
    });

    return response.complete;
  }
};
