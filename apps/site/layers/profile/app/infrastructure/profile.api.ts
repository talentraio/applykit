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
  },

  /**
   * Upload profile photo.
   */
  async uploadPhotoApi(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return await useApi(`${profileUrl}/photo`, {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Delete profile photo.
   */
  async deletePhotoApi() {
    return await useApi(`${profileUrl}/photo`, {
      method: 'DELETE'
    });
  },

  /**
   * Delete current account and related data.
   */
  async deleteAccountApi() {
    return await useApi(`${profileUrl}/account`, {
      method: 'DELETE'
    });
  }
};
