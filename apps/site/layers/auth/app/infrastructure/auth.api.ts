import type { AcceptTermsResponse, AuthMeResponse, LoginInput, RegisterInput } from '@int/schema';

const authUrl = '/api/auth';

/**
 * Site Auth API
 *
 * Handles auth-related API calls for the site app.
 */
export const siteAuthApi = {
  async fetchMe(): Promise<AuthMeResponse> {
    return useApi(`${authUrl}/me`, {
      method: 'GET'
    });
  },

  async logout(): Promise<void> {
    useApi(`${authUrl}/logout`, {
      method: 'POST'
    });
  },

  async acceptTerms(legalVersion: string): Promise<AcceptTermsResponse> {
    return useApi('/api/user/accept-terms', {
      method: 'POST',
      body: { legalVersion }
    });
  },

  async register(input: RegisterInput): Promise<void> {
    await useApi(`${authUrl}/register`, {
      method: 'POST',
      body: input
    });
  },

  async login(input: LoginInput): Promise<void> {
    await useApi(`${authUrl}/login`, {
      method: 'POST',
      body: input,
      // Login form handles errors inline (invalid credentials, etc.).
      // Bypass global redirect side effects for this endpoint.
      onResponseError({ response }) {
        throw new ApiError(response);
      }
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await useApi(`${authUrl}/forgot-password`, {
      method: 'POST',
      body: { email }
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await useApi(`${authUrl}/reset-password`, {
      method: 'POST',
      body: { token, password }
    });
  },

  async sendVerification(): Promise<void> {
    await useApi(`${authUrl}/send-verification`, {
      method: 'POST'
    });
  }
};
