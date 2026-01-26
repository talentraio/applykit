import type { LLMKey, LLMKeyInput } from '@int/schema';
import { keysApi } from '../infrastructure/keys.api';

/**
 * Keys Store
 *
 * Manages BYOK key metadata for the current user.
 * Stores only provider + hint metadata (no full keys).
 */
export const useKeysStore = defineStore('KeysStore', {
  state: (): {
    keys: LLMKey[];
    loading: boolean;
    error: Error | null;
  } => ({
    keys: [],
    loading: false,
    error: null
  }),

  getters: {
    hasKeys: state => state.keys.length > 0
  },

  actions: {
    /**
     * Fetch all key metadata for current user
     */
    async fetchKeys(): Promise<LLMKey[]> {
      this.loading = true;
      this.error = null;

      try {
        const keys = await keysApi.fetchAll();
        this.keys = keys;
        return keys;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to fetch keys');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Save (create or replace) key metadata
     */
    async saveKey(data: LLMKeyInput): Promise<LLMKey> {
      this.loading = true;
      this.error = null;

      try {
        const saved = await keysApi.upsert(data);
        const index = this.keys.findIndex(key => key.id === saved.id);

        if (index >= 0) {
          this.keys[index] = saved;
        } else {
          const providerIndex = this.keys.findIndex(key => key.provider === saved.provider);
          if (providerIndex >= 0) {
            this.keys[providerIndex] = saved;
          } else {
            this.keys.unshift(saved);
          }
        }

        return saved;
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to save key');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete key metadata
     */
    async deleteKey(id: string): Promise<void> {
      this.loading = true;
      this.error = null;

      try {
        await keysApi.delete(id);
        this.keys = this.keys.filter(key => key.id !== id);
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to delete key');
        throw this.error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reset store state
     */
    $reset() {
      this.keys = [];
      this.loading = false;
      this.error = null;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useKeysStore, import.meta.hot));
}
