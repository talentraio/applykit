import type { AuthMeResponse } from '@int/schema';

const authUrl = '/api/auth';

/**
 * Admin Auth API
 *
 * Handles auth-related API calls for the admin app.
 */
export const adminAuthApi = {
  async fetchMe(): Promise<AuthMeResponse> {
    return useApi(`${authUrl}/me`, {
      method: 'GET'
    });
  },

  async logout(): Promise<void> {
    useApi(`${authUrl}/logout`, {
      method: 'POST'
    });
  }
};
