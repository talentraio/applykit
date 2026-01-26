/**
 * Keys Composable
 *
 * Thin proxy over keys store for convenient access in components.
 * Does NOT hold state - all state lives in useKeysStore.
 *
 * Related: T128 (US7)
 */

import type { LLMKey, LLMKeyInput } from '@int/schema';
import { useKeysStore } from '../stores/keys';

export type UseKeysReturn = {
  /**
   * List of key metadata for the user
   */
  keys: ComputedRef<LLMKey[]>;

  /**
   * Loading state
   */
  loading: ComputedRef<boolean>;

  /**
   * Error state
   */
  error: ComputedRef<Error | null>;

  /**
   * Whether user has any keys
   */
  hasKeys: ComputedRef<boolean>;

  /**
   * Fetch keys from the API
   */
  fetchKeys: () => Promise<LLMKey[]>;

  /**
   * Save key metadata
   */
  saveKey: (data: LLMKeyInput) => Promise<LLMKey>;

  /**
   * Delete key metadata
   */
  deleteKey: (id: string) => Promise<void>;
};

export function useKeys(): UseKeysReturn {
  const store = useKeysStore();

  return {
    keys: computed(() => store.keys),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasKeys: computed(() => store.hasKeys),
    fetchKeys: () => store.fetchKeys(),
    saveKey: (data: LLMKeyInput) => store.saveKey(data),
    deleteKey: (id: string) => store.deleteKey(id)
  };
}
