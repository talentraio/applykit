import type { LLMKey, LLMKeyInput } from '@int/schema';

const keysUrl = '/api/keys';

/**
 * Keys API
 *
 * Handles BYOK key metadata operations (hint-only).
 * Used by keys store actions.
 */
export const keysApi = {
  /**
   * Fetch all key metadata for current user
   */
  async fetchAll(): Promise<LLMKey[]> {
    return await useApi(keysUrl, {
      method: 'GET'
    });
  },

  /**
   * Create or replace key metadata for a provider
   */
  async upsert(data: LLMKeyInput): Promise<LLMKey> {
    return await useApi(keysUrl, {
      method: 'POST',
      body: data
    });
  },

  /**
   * Delete key metadata by ID
   */
  async delete(id: string): Promise<void> {
    await useApi(`${keysUrl}/${id}`, {
      method: 'DELETE'
    });
  }
};
